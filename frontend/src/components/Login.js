import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // Add this import
import axios from 'axios';
import { API_BASE_URL } from '../utils/api';
import '../styles/Login.css';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth(); // Add this line

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Login form submitted');
    console.log('API_BASE_URL:', API_BASE_URL);
    console.log('Form data:', formData);
    
    setLoading(true);
    setError('');

    try {
      console.log('Making login request to:', `${API_BASE_URL}/api/auth/login`);
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, formData);
      console.log('Login response received:', response.data);
      
      // Use AuthContext login method instead of direct localStorage
      login(response.data.token, response.data.user);
      console.log('AuthContext login called');
      
      // Redirect based on user role
      if (response.data.user.role === 'admin') {
        console.log('Redirecting to admin dashboard');
        navigate('/admin/dashboard');
      } else {
        console.log('Redirecting to support dashboard');
        navigate('/support/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
      console.error('Error response:', error.response);
      setError(error.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h2>Login to Support System</h2>
          <p>Enter your credentials to access the ticketing system</p>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter your password"
            />
          </div>
          
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        
        <div className="login-footer">
          <button className="back-btn" onClick={() => navigate('/')}>
            ← Back to Homepage
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;