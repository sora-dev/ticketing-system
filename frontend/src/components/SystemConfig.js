import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/api';
import './SystemConfig.css';

const SystemConfig = () => {
  const [config, setConfig] = useState({
    maxFailedLoginAttempts: 5,
    lockoutDurationHours: 2,
    sessionTimeoutMinutes: 60,
    passwordMinLength: 6,
    enableAccountLockout: true
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/system-config`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConfig(response.data);
    } catch (error) {
      setError('Failed to load system configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE_URL}/api/system-config`, config, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('System configuration updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleResetLockouts = async () => {
    if (!window.confirm('Are you sure you want to reset all user account lockouts?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_BASE_URL}/api/system-config/reset-lockouts`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage(response.data.message);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to reset lockouts');
    }
  };

  const handleChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return <div className="loading">Loading system configuration...</div>;
  }

  return (
    <div className="system-config">
      <div className="header">
        <h1>System Configuration</h1>
        <p>Configure security and system behavior settings</p>
      </div>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="config-form">
        <div className="config-section">
          <h2>🔒 Security Settings</h2>
          
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={config.enableAccountLockout}
                onChange={(e) => handleChange('enableAccountLockout', e.target.checked)}
              />
              Enable Account Lockout
            </label>
            <small>Automatically lock accounts after failed login attempts</small>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Maximum Failed Login Attempts</label>
              <input
                type="number"
                min="1"
                max="20"
                value={config.maxFailedLoginAttempts}
                onChange={(e) => handleChange('maxFailedLoginAttempts', parseInt(e.target.value))}
                disabled={!config.enableAccountLockout}
              />
              <small>Number of failed attempts before account lockout</small>
            </div>

            <div className="form-group">
              <label>Lockout Duration (Hours)</label>
              <input
                type="number"
                min="0.5"
                max="24"
                step="0.5"
                value={config.lockoutDurationHours}
                onChange={(e) => handleChange('lockoutDurationHours', parseFloat(e.target.value))}
                disabled={!config.enableAccountLockout}
              />
              <small>How long accounts remain locked</small>
            </div>
          </div>
        </div>

        <div className="config-section">
          <h2>⚙️ General Settings</h2>
          
          <div className="form-row">
            <div className="form-group">
              <label>Session Timeout (Minutes)</label>
              <input
                type="number"
                min="15"
                max="480"
                value={config.sessionTimeoutMinutes}
                onChange={(e) => handleChange('sessionTimeoutMinutes', parseInt(e.target.value))}
              />
              <small>Automatic logout after inactivity</small>
            </div>

            <div className="form-group">
              <label>Minimum Password Length</label>
              <input
                type="number"
                min="4"
                max="20"
                value={config.passwordMinLength}
                onChange={(e) => handleChange('passwordMinLength', parseInt(e.target.value))}
              />
              <small>Required minimum characters for passwords</small>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
          
          <button 
            type="button" 
            className="btn-secondary"
            onClick={handleResetLockouts}
          >
            Reset All Lockouts
          </button>
        </div>
      </form>

      {config.updatedBy && (
        <div className="config-info">
          <small>
            Last updated by: {config.updatedBy.name} on {new Date(config.updatedAt).toLocaleString()}
          </small>
        </div>
      )}
    </div>
  );
};

export default SystemConfig;