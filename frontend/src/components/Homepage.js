import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Homepage.css";
import KnowledgeBase from "./KnowledgeBase";

const Homepage = () => {
  const navigate = useNavigate();

  const handleLoginClick = () => {
    navigate("/login");
  };

  return (
    <div className="homepage">
      <div className="hero-section">
        <div className="container">
          <h1 className="hero-title">🏦 RBI iTrack</h1>
          <p className="hero-subtitle">
            Internal Technical Support Portal — Submit and track your IT
            concerns efficiently.
          </p>
          <div className="hero-buttons">
            <button
              className="btn btn-primary btn-homepage"
              onClick={handleLoginClick}
            >
              Staff Login
            </button>
            <button
              className="btn btn-secondary btn-homepage"
              onClick={() => navigate("/about")}
            >
              Learn More
            </button>
          </div>
        </div>
      </div>

      {/* Knowledge Base Section - Added before features */}
      <div className="knowledge-base-section">
        <div className="container">
          <KnowledgeBase />
        </div>
      </div>

      <div className="features-section">
        <div className="container">
          <h2>System Features</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🎫</div>
              <h3>Ticket Management</h3>
              <p>
                Create, assign, and track internal support tickets efficiently
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📚</div>
              <h3>Knowledge Base</h3>
              <p>
                Search and access comprehensive banking procedures and solutions
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">👥</div>
              <h3>Staff Management</h3>
              <p>
                Manage admin and support staff with role-based access control
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Analytics Dashboard</h3>
              <p>Monitor ticket statistics and team performance metrics</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3>Secure Access</h3>
              <p>JWT-based authentication with role-based permissions</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🏦</div>
              <h3>Banking Focused</h3>
              <p>
                Tailored specifically for internal banking operations and
                procedures
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Section */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-info">
              <h4>🏦 RBI iTrack</h4>
              <p>Track, escalate, and resolve IT concerns—faster.</p>
            </div>
            <div className="footer-copyright">
              <p>
                &copy; {new Date().getFullYear()} Rural Bank of Itogon
                (Benguet), Inc. All rights reserved.
              </p>
              <p className="footer-note">For internal use only</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Homepage;
