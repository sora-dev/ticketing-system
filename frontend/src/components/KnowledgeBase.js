import axios from "axios";
import React, { useEffect, useState } from "react";
import "./KnowledgeBase.css";

const KnowledgeBase = () => {
  const [articles, setArticles] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const categories = [
    { value: "all", label: "All Categories" },
    { value: "account-management", label: "Account Management" },
    { value: "transactions", label: "Transactions" },
    { value: "cards", label: "Cards & ATM" },
    { value: "loans", label: "Loans & Credit" },
    { value: "technical-issues", label: "Technical Issues" },
    { value: "security", label: "Security" },
    { value: "mobile-banking", label: "Mobile Banking" },
    { value: "online-banking", label: "Online Banking" },
    { value: "general", label: "General" },
  ];

  useEffect(() => {
    fetchArticles();
  }, [searchTerm, selectedCategory]);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const params = {
        limit: 20,
      };

      if (searchTerm) params.search = searchTerm;
      if (selectedCategory !== "all") params.category = selectedCategory;

      const response = await axios.get(
        "http://localhost:5000/api/knowledge-base",
        { params }
      );
      setArticles(response.data.articles);
    } catch (error) {
      console.error("Error fetching articles:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleArticleClick = async (article) => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/knowledge-base/${article._id}`
      );
      setSelectedArticle(response.data);
      setShowModal(true);
    } catch (error) {
      console.error("Error fetching article details:", error);
    }
  };

  const handleRating = async (helpful) => {
    if (!selectedArticle) return;

    try {
      await axios.post(
        `http://localhost:5000/api/knowledge-base/${selectedArticle._id}/rate`,
        {
          helpful,
        }
      );
      // Update the article's rating in the modal
      setSelectedArticle((prev) => ({
        ...prev,
        helpful: helpful ? prev.helpful + 1 : prev.helpful,
        notHelpful: !helpful ? prev.notHelpful + 1 : prev.notHelpful,
      }));
    } catch (error) {
      console.error("Error rating article:", error);
    }
  };

  const getCategoryLabel = (value) => {
    const category = categories.find((cat) => cat.value === value);
    return category ? category.label : value;
  };

  return (
    <div className="knowledge-base">
      <div className="kb-header">
        <h2>RBI Knowledge Base</h2>
        <p>Find answers to common technical concerns and issues</p>
      </div>

      <div className="kb-search">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search for solutions, procedures, or common issues..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <button className="search-btn">🔍</button>
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="category-select"
        >
          {categories.map((category) => (
            <option key={category.value} value={category.value}>
              {category.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="loading">Searching knowledge base...</div>
      ) : (
        <div className="kb-results">
          {articles.length === 0 ? (
            <div className="no-results">
              <p>
                No articles found. Try adjusting your search terms or category.
              </p>
            </div>
          ) : (
            <div className="articles-grid">
              {articles.map((article) => (
                <div
                  key={article._id}
                  className="article-card"
                  onClick={() => handleArticleClick(article)}
                >
                  <div className="article-header">
                    <h3>{article.title}</h3>
                    <span className="article-category">
                      {getCategoryLabel(article.category)}
                    </span>
                  </div>

                  <p className="article-preview">
                    {article.content.substring(0, 150)}...
                  </p>

                  <div className="article-meta">
                    <span className="views">👁️ {article.views} views</span>
                    <span className="helpful">👍 {article.helpful}</span>
                    {article.tags && article.tags.length > 0 && (
                      <div className="tags">
                        {article.tags.slice(0, 2).map((tag) => (
                          <span key={tag} className="tag">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Article Detail Modal */}
      {showModal && selectedArticle && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="article-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedArticle.title}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>

            <div className="modal-content">
              <div className="article-info">
                <span className="category">
                  {getCategoryLabel(selectedArticle.category)}
                </span>
                <span className="author">
                  By: {selectedArticle.createdBy?.name}
                </span>
                <span className="date">
                  {new Date(selectedArticle.createdAt).toLocaleDateString()}
                </span>
              </div>

              <div className="article-content">
                {selectedArticle.content.split("\n").map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>

              {selectedArticle.tags && selectedArticle.tags.length > 0 && (
                <div className="article-tags">
                  <strong>Tags: </strong>
                  {selectedArticle.tags.map((tag) => (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="article-rating">
                <p>Was this article helpful?</p>
                <div className="rating-buttons">
                  <button
                    className="rating-btn helpful"
                    onClick={() => handleRating(true)}
                  >
                    👍 Yes ({selectedArticle.helpful})
                  </button>
                  <button
                    className="rating-btn not-helpful"
                    onClick={() => handleRating(false)}
                  >
                    👎 No ({selectedArticle.notHelpful})
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBase;
