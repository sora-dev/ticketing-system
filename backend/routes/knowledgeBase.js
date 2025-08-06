const express = require('express');
const router = express.Router();
const KnowledgeBase = require('../models/KnowledgeBase');
const { auth, adminAuth } = require('../middleware/auth');

// Get all published knowledge base articles (public)
router.get('/', async (req, res) => {
  try {
    const { search, category, limit = 10, page = 1 } = req.query;
    let query = { isPublished: true };
    
    // Add search functionality
    if (search) {
      query.$text = { $search: search };
    }
    
    // Add category filter
    if (category && category !== 'all') {
      query.category = category;
    }
    
    const articles = await KnowledgeBase.find(query)
      .populate('createdBy', 'name')
      .sort(search ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const total = await KnowledgeBase.countDocuments(query);
    
    res.json({
      articles,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single article by ID
router.get('/:id', async (req, res) => {
  try {
    const article = await KnowledgeBase.findById(req.params.id)
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name');
    
    if (!article || !article.isPublished) {
      return res.status(404).json({ message: 'Article not found' });
    }
    
    // Increment view count
    article.views += 1;
    await article.save();
    
    res.json(article);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Rate article helpfulness
router.post('/:id/rate', async (req, res) => {
  try {
    const { helpful } = req.body;
    const article = await KnowledgeBase.findById(req.params.id);
    
    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }
    
    if (helpful) {
      article.helpful += 1;
    } else {
      article.notHelpful += 1;
    }
    
    await article.save();
    res.json({ message: 'Rating recorded' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin routes - require authentication and admin role

// Get all articles for admin (including unpublished)
router.get('/admin/all', auth, adminAuth, async (req, res) => {
  try {
    const { search, category, status } = req.query;
    let query = {};
    
    if (search) {
      query.$text = { $search: search };
    }
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (status && status !== 'all') {
      query.isPublished = status === 'published';
    }
    
    const articles = await KnowledgeBase.find(query)
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name')
      .sort({ createdAt: -1 });
    
    res.json(articles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new article
router.post('/admin', auth, adminAuth, async (req, res) => {
  try {
    const { title, content, category, tags, isPublished } = req.body;
    
    const article = new KnowledgeBase({
      title,
      content,
      category,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      isPublished: isPublished !== undefined ? isPublished : true,
      createdBy: req.user._id
    });
    
    await article.save();
    await article.populate('createdBy', 'name');
    
    res.status(201).json(article);
  } catch (error) {
    console.error('Error updating knowledge base article:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(400).json({ message: error.message });
  }
});

// Update article
router.put('/admin/:id', auth, adminAuth, async (req, res) => {
  try {
    console.log('PUT request body keys:', Object.keys(req.body));
    console.log('PUT request params:', req.params);
    console.log('PUT request user:', req.user ? req.user.name : 'No user');
    console.log('Content length:', req.body.content ? req.body.content.length : 'No content');
    const { title, content, category, tags, isPublished } = req.body;
    
    const article = await KnowledgeBase.findById(req.params.id);
    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }
    
    article.title = title || article.title;
    article.content = content || article.content;
    article.category = category || article.category;
    article.tags = tags ? tags.split(',').map(tag => tag.trim()) : article.tags;
    article.isPublished = isPublished !== undefined ? isPublished : article.isPublished;
    article.updatedBy = req.user._id;
    
    await article.save();
    await article.populate('createdBy', 'name');
    await article.populate('updatedBy', 'name');
    
    res.json(article);
  } catch (error) {
    console.error('Error updating knowledge base article:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(400).json({ message: error.message });
  }
});

// Delete article
router.delete('/admin/:id', auth, adminAuth, async (req, res) => {
  try {
    const article = await KnowledgeBase.findById(req.params.id);
    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }
    
    await article.deleteOne();
    res.json({ message: 'Article deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get knowledge base statistics
router.get('/admin/stats', auth, adminAuth, async (req, res) => {
  try {
    const totalArticles = await KnowledgeBase.countDocuments();
    const publishedArticles = await KnowledgeBase.countDocuments({ isPublished: true });
    const draftArticles = await KnowledgeBase.countDocuments({ isPublished: false });
    
    const topViewed = await KnowledgeBase.find({ isPublished: true })
      .sort({ views: -1 })
      .limit(5)
      .select('title views');
    
    const categoryStats = await KnowledgeBase.aggregate([
      { $match: { isPublished: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    res.json({
      totalArticles,
      publishedArticles,
      draftArticles,
      topViewed,
      categoryStats
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;