import React, { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import "./Layout.css";

const Layout = () => {
  const [user, setUser] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [loading, setLoading] = useState(true); // Add loading state
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const verifyAuth = async () => {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      
      if (!token || !userData) {
        setLoading(false);
        navigate('/login');
        return;
      }

      try {
        // Verify token with backend
        const response = await axios.get('http://localhost:5000/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        // Update user data with fresh data from backend
        const freshUserData = {
          id: response.data._id,
          name: response.data.name,
          email: response.data.email,
          role: response.data.role
        };
        
        setUser(freshUserData);
        localStorage.setItem('user', JSON.stringify(freshUserData));
      } catch (error) {
        console.error('Token verification failed:', error);
        // Clear invalid session
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    verifyAuth();
  }, []); // Only run on mount

  // Show loading spinner while verifying authentication
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px'
      }}>
        Verifying authentication...
      </div>
    );
  }

  // Don't render layout if no user (will redirect to login)
  if (!user) {
    return null;
  }

  // REMOVE THESE LINES (they cause infinite re-render):
  // const userData = localStorage.getItem("user");
  // if (userData) {
  //   setUser(JSON.parse(userData));
  // }

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        // Call backend logout endpoint to log the event
        await axios.post('http://localhost:5000/api/auth/logout', {}, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Continue with logout even if API call fails
    } finally {
      // Always clear local storage and redirect
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/login");
    }
  };

  const getNavItems = () => {
    if (!user) return [];

    const baseItems = [
      { path: "/tickets", label: "Tickets", icon: "🎫" },
      { path: "/knowledge-base", label: "Knowledge Base", icon: "📚" },
    ];

    if (user.role === "admin") {
      return [
        { path: "/admin/dashboard", label: "Dashboard", icon: "📊" },
        ...baseItems,
        { path: "/admin/users", label: "User Management", icon: "👥" },
        { path: "/admin/knowledge-base", label: "KB Admin", icon: "⚙️" },
        { path: "/admin/system-config", label: "System Config", icon: "🔧" },
        { path: "/admin/audit-log", label: "Audit Log", icon: "📋" },
      ];
    } else if (user.role === "support") {
      return [
        { path: "/support/dashboard", label: "Dashboard", icon: "📊" },
        ...baseItems,
      ];
    } else {
      return [
        { path: "/user/dashboard", label: "Dashboard", icon: "📊" },
        ...baseItems,
      ];
    }
  };

  const isActive = (path) => {
    return location.pathname === path ? "active" : "";
  };

  return (
    <div className="layout">
      {/* Top Navbar */}
      <nav className="top-navbar">
        <div className="navbar-left">
          <h2>Support Ticketing System</h2>
        </div>
        <div className="navbar-right">
          <div className="user-info">
            <span>Welcome, {user?.name || "User"}</span>
            <span className="user-role">({user?.role || "user"})</span>
          </div>
          <button
            className="nav-btn"
            onClick={() => setShowProfileModal(true)}
            title="Settings"
          >
            ⚙️
          </button>
          <button
            className="nav-btn logout-btn"
            onClick={handleLogout}
            title="Logout"
          >
            🚪
          </button>
        </div>
      </nav>

      <div className="layout-body">
        {/* Sidebar */}
        <aside className="sidebar">
          <nav className="sidebar-nav">
            <ul>
              <li>
                <button
                  className={`nav-item ${
                    isActive("/admin/dashboard") ||
                    isActive("/support/dashboard")
                  }`}
                  onClick={() =>
                    navigate(
                      user?.role === "admin"
                        ? "/admin/dashboard"
                        : "/support/dashboard"
                    )
                  }
                >
                  📊 Dashboard
                </button>
              </li>
              <li>
                <button
                  className={`nav-item ${isActive("/tickets")}`}
                  onClick={() => navigate("/tickets")}
                >
                  🎫 Tickets
                </button>
              </li>
              {/* Add Knowledge Base for all users */}
              <li>
                <button
                  className={`nav-item ${isActive("/knowledge-base")}`}
                  onClick={() => navigate("/knowledge-base")}
                >
                  📚 Knowledge Base
                </button>
              </li>
              {user?.role === "admin" && (
                <li>
                  <button
                    className={`nav-item ${isActive("/admin/users")}`}
                    onClick={() => navigate("/admin/users")}
                  >
                    👥 User Management
                  </button>
                </li>
              )}
              {/* Keep the admin-specific Knowledge Base as KB Admin */}
              {user?.role === "admin" && (
                <li>
                  <button
                    className={`nav-item ${isActive("/admin/knowledge-base")}`}
                    onClick={() => navigate("/admin/knowledge-base")}
                  >
                    ⚙️ KB Management
                  </button>
                </li>
              )}
              {user?.role === "admin" && (
                <li>
                  <button
                    className={`nav-item ${isActive("/admin/system-config")}`}
                    onClick={() => navigate("/admin/system-config")}
                  >
                    🔧 System Config
                  </button>
                </li>
              )}
              {user?.role === "admin" && (
                <li>
                  <button
                    className={`nav-item ${isActive("/admin/audit-log")}`}
                    onClick={() => navigate("/admin/audit-log")}
                  >
                    🔍 Audit Log
                  </button>
                </li>
              )}
              {/* Add Reports module for all users */}
              <li>
                <button
                  className={`nav-item ${isActive("/reports")}`}
                  onClick={() => navigate("/reports")}
                >
                  📊 Reports
                </button>
              </li>
              <li>
                <button
                  className={`nav-item ${isActive("/tickets/create")}`}
                  onClick={() => navigate("/tickets/create")}
                >
                  ➕ Create Ticket
                </button>
              </li>
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="main-content">
          <Outlet />
        </main>
      </div>

      {/* Profile Settings Modal */}
      {showProfileModal && (
        <ProfileModal
          user={user}
          onClose={() => setShowProfileModal(false)}
          onUpdate={setUser}
        />
      )}
    </div>
  );
};

// Profile Settings Modal Component
const ProfileModal = ({ user, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    // Validate password change
    if (
      formData.newPassword &&
      formData.newPassword !== formData.confirmPassword
    ) {
      setError("New passwords do not match");
      setLoading(false);
      return;
    }

    // For non-admin users, require password change
    if (user?.role !== 'admin' && !formData.newPassword) {
      setError("Please enter a new password to update your profile");
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const updateData = {};

      // Only admins can update name and email in profile settings
      if (user?.role === 'admin') {
        updateData.name = formData.name;
        updateData.email = formData.email;
      }

      // Include password fields if user wants to change password
      if (formData.newPassword) {
        updateData.currentPassword = formData.currentPassword;
        updateData.newPassword = formData.newPassword;
      }

      const response = await fetch("http://localhost:5000/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(user?.role === 'admin' ? "Profile updated successfully!" : "Password updated successfully!");
        // Update user data in localStorage and state only for admins
        if (user?.role === 'admin') {
          const updatedUser = {
            ...user,
            name: formData.name,
            email: formData.email,
          };
          localStorage.setItem("user", JSON.stringify(updatedUser));
          onUpdate(updatedUser);
        }

        // Clear password fields
        setFormData({
          ...formData,
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        setError(data.message || "Failed to update profile");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="profile-modal">
        <div className="modal-header">
          <h3>Profile Settings</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="profile-form">
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          {user?.role === 'admin' && (
            <div className="form-section">
              <h4>Personal Information</h4>
              <div className="form-group">
                <label htmlFor="name">Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          )}

          {user?.role !== 'admin' && (
            <div className="form-section">
              <h4>Current Information (Read-only)</h4>
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={user?.name || ''}
                  disabled
                  style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                />
              </div>
              <p style={{ fontSize: '0.9rem', color: '#666', fontStyle: 'italic' }}>
                Note: Only administrators can edit name and email. Contact your administrator for changes.
              </p>
            </div>
          )}

          <div className="form-section">
            <h4>Change Password {user?.role !== 'admin' ? '(Required)' : '(Optional)'}</h4>
            <div className="form-group">
              <label htmlFor="currentPassword">Current Password</label>
              <input
                type="password"
                id="currentPassword"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                placeholder="Enter current password"
                required={formData.newPassword ? true : false}
              />
            </div>

            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                placeholder="Enter new password"
                required={user?.role !== 'admin'}
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm new password"
                required={formData.newPassword ? true : false}
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Updating..." : (user?.role === 'admin' ? "Update Profile" : "Change Password")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Layout;
