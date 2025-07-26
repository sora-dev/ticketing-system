import axios from "axios";
import React, { useEffect, useState } from "react";
import "./KnowledgeBaseAdmin.css";

const KnowledgeBaseAdmin = () => {
  const [articles, setArticles] = useState([]);
  const [stats, setStats] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "general",
    tags: "",
    isPublished: true,
  });
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);

  const categories = [
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
    fetchStats();
  }, [filter]);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const params = filter !== "all" ? { status: filter } : {};

      const response = await axios.get(
        "http://localhost:5000/api/knowledge-base/admin/all",
        {
          headers: { Authorization: `Bearer ${token}` },
          params,
        }
      );
      setArticles(response.data);
    } catch (error) {
      console.error("Error fetching articles:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        "http://localhost:5000/api/knowledge-base/admin/stats",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setStats(response.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const url = editingArticle
        ? `http://localhost:5000/api/knowledge-base/admin/${editingArticle._id}`
        : "http://localhost:5000/api/knowledge-base/admin";

      const method = editingArticle ? "put" : "post";

      await axios[method](url, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setShowModal(false);
      setEditingArticle(null);
      setFormData({
        title: "",
        content: "",
        category: "general",
        tags: "",
        isPublished: true,
      });
      fetchArticles();
      fetchStats();
    } catch (error) {
      console.error("Error saving article:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (article) => {
    setEditingArticle(article);
    setFormData({
      title: article.title,
      content: article.content,
      category: article.category,
      tags: article.tags.join(", "),
      isPublished: article.isPublished,
    });
    setShowModal(true);
  };

  const handleDelete = async (articleId) => {
    if (!window.confirm("Are you sure you want to delete this article?"))
      return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `http://localhost:5000/api/knowledge-base/admin/${articleId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      fetchArticles();
      fetchStats();
    } catch (error) {
      console.error("Error deleting article:", error);
    }
  };

  const getCategoryLabel = (value) => {
    const category = categories.find((cat) => cat.value === value);
    return category ? category.label : value;
  };

  return (
    <div className="kb-admin">
      <div className="kb-admin-header">
        <h1>Knowledge Base Management</h1>
        <button
          className="btn-primary"
          onClick={() => {
            setEditingArticle(null);
            setFormData({
              title: "",
              content: "",
              category: "general",
              tags: "",
              isPublished: true,
            });
            setShowModal(true);
          }}
        >
          Create New Article
        </button>
      </div>

      {/* Statistics */}
      <div className="kb-stats">
        <div className="stat-card">
          <h3>Total Articles</h3>
          <p className="stat-number">{stats.totalArticles || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Published</h3>
          <p className="stat-number">{stats.publishedArticles || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Drafts</h3>
          <p className="stat-number">{stats.draftArticles || 0}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="kb-filters">
        <button
          className={`filter-btn ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          All Articles
        </button>
        <button
          className={`filter-btn ${filter === "published" ? "active" : ""}`}
          onClick={() => setFilter("published")}
        >
          Published
        </button>
        <button
          className={`filter-btn ${filter === "draft" ? "active" : ""}`}
          onClick={() => setFilter("draft")}
        >
          Drafts
        </button>
      </div>

      {/* Articles Table */}
      <div className="kb-table">
        {loading ? (
          <div className="loading">Loading articles...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Status</th>
                <th>Views</th>
                <th>Rating</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((article) => (
                <tr key={article._id}>
                  <td>
                    <div className="article-title">
                      {article.title}
                      {article.tags.length > 0 && (
                        <div className="article-tags">
                          {article.tags.slice(0, 2).map((tag) => (
                            <span key={tag} className="tag">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>{getCategoryLabel(article.category)}</td>
                  <td>
                    <span
                      className={`status ${
                        article.isPublished ? "published" : "draft"
                      }`}
                    >
                      {article.isPublished ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td>{article.views}</td>
                  <td>
                    <div className="rating">
                      <span className="helpful">👍 {article.helpful}</span>
                      <span className="not-helpful">
                        👎 {article.notHelpful}
                      </span>
                    </div>
                  </td>
                  <td>{new Date(article.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="actions">
                      <button
                        className="btn-edit"
                        onClick={() => handleEdit(article)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => handleDelete(article._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="kb-modal">
            <div className="modal-header">
              <h2>{editingArticle ? "Edit Article" : "Create New Article"}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="kb-form">
              <div className="form-group">
                <label htmlFor="title">Title *</label>
                <input
                  type="text"
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                  placeholder="Enter article title"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="category">Category *</label>
                  <select
                    id="category"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    required
                  >
                    {categories.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="tags">Tags</label>
                  <input
                    type="text"
                    id="tags"
                    value={formData.tags}
                    onChange={(e) =>
                      setFormData({ ...formData, tags: e.target.value })
                    }
                    placeholder="Enter tags separated by commas"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="content">Content *</label>
                <textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  required
                  rows="10"
                  placeholder="Enter the article content..."
                />
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.isPublished}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        isPublished: e.target.checked,
                      })
                    }
                  />
                  Publish immediately
                </label>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading
                    ? "Saving..."
                    : editingArticle
                    ? "Update Article"
                    : "Create Article"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBaseAdmin;
