import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './DatabaseBackup.css';

const DatabaseBackup = () => {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [description, setDescription] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState(null);

  useEffect(() => {
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/backup/list', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setBackups(response.data.backups);
    } catch (error) {
      console.error('Error fetching backups:', error);
      alert('Failed to fetch backups');
    } finally {
      setLoading(false);
    }
  };

  const createBackup = async () => {
    try {
      setCreating(true);
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:5000/api/backup/create', 
        { description },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      alert('Backup created successfully!');
      setDescription('');
      setShowCreateModal(false);
      fetchBackups();
    } catch (error) {
      console.error('Error creating backup:', error);
      alert('Failed to create backup: ' + (error.response?.data?.message || error.message));
    } finally {
      setCreating(false);
    }
  };

  const downloadBackup = async (fileName) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/backup/download/${fileName}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${fileName}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading backup:', error);
      alert('Failed to download backup');
    }
  };

  const deleteBackup = async (fileName) => {
    if (!window.confirm(`Are you sure you want to delete backup "${fileName}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/backup/${fileName}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      alert('Backup deleted successfully!');
      fetchBackups();
    } catch (error) {
      console.error('Error deleting backup:', error);
      alert('Failed to delete backup');
    }
  };

  const restoreBackup = async () => {
    if (!selectedBackup) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/backup/restore/${selectedBackup.fileName}`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      alert('Database restored successfully! Please refresh the page.');
      setShowRestoreModal(false);
      setSelectedBackup(null);
    } catch (error) {
      console.error('Error restoring backup:', error);
      alert('Failed to restore backup: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="backup-container">
      <div className="backup-header">
        <h2>Database Backup Management</h2>
        <button 
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
          disabled={creating}
        >
          {creating ? 'Creating...' : '🗄️ Create Backup'}
        </button>
      </div>

      <div className="backup-info">
        <div className="info-card">
          <h3>📊 Backup Statistics</h3>
          <div className="stats">
            <div className="stat-item">
              <span className="stat-label">Total Backups:</span>
              <span className="stat-value">{backups.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Size:</span>
              <span className="stat-value">
                {backups.reduce((total, backup) => {
                  const size = parseFloat(backup.size.replace(' MB', ''));
                  return total + size;
                }, 0).toFixed(2)} MB
              </span>
            </div>
          </div>
        </div>
        
        <div className="info-card">
          <h3>⚠️ Important Notes</h3>
          <ul>
            <li>Backups are stored locally on the server</li>
            <li>Restoring will replace current database data</li>
            <li>Always download important backups for safekeeping</li>
            <li>Only administrators can manage backups</li>
          </ul>
        </div>
      </div>

      <div className="backup-list">
        <h3>Available Backups</h3>
        {loading ? (
          <div className="loading">Loading backups...</div>
        ) : backups.length === 0 ? (
          <div className="no-backups">
            <p>No backups found. Create your first backup to get started.</p>
          </div>
        ) : (
          <div className="backup-table">
            <table>
              <thead>
                <tr>
                  <th>Backup Name</th>
                  <th>Size</th>
                  <th>Created Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((backup, index) => (
                  <tr key={index}>
                    <td className="backup-name">{backup.fileName}</td>
                    <td>{backup.size}</td>
                    <td>{formatDate(backup.createdAt)}</td>
                    <td className="backup-actions">
                      <button 
                        className="btn btn-sm btn-secondary"
                        onClick={() => downloadBackup(backup.fileName)}
                        title="Download Backup"
                      >
                        📥
                      </button>
                      <button 
                        className="btn btn-sm btn-warning"
                        onClick={() => {
                          setSelectedBackup(backup);
                          setShowRestoreModal(true);
                        }}
                        title="Restore Backup"
                      >
                        🔄
                      </button>
                      <button 
                        className="btn btn-sm btn-danger"
                        onClick={() => deleteBackup(backup.fileName)}
                        title="Delete Backup"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Backup Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Create Database Backup</h3>
              <button 
                className="close-btn"
                onClick={() => setShowCreateModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Description (Optional):</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Before system update, Weekly backup, etc."
                  maxLength={100}
                />
              </div>
              <div className="backup-warning">
                <p>⚠️ This will create a complete backup of your database. The process may take a few minutes depending on the database size.</p>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowCreateModal(false)}
                disabled={creating}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={createBackup}
                disabled={creating}
              >
                {creating ? 'Creating Backup...' : 'Create Backup'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Backup Modal */}
      {showRestoreModal && selectedBackup && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Restore Database Backup</h3>
              <button 
                className="close-btn"
                onClick={() => setShowRestoreModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="restore-warning">
                <h4>⚠️ WARNING: This action cannot be undone!</h4>
                <p>You are about to restore the database from:</p>
                <div className="backup-details">
                  <strong>{selectedBackup.fileName}</strong><br/>
                  <small>Created: {formatDate(selectedBackup.createdAt)}</small><br/>
                  <small>Size: {selectedBackup.size}</small>
                </div>
                <p>This will:</p>
                <ul>
                  <li>Replace ALL current database data</li>
                  <li>Remove any data created after this backup</li>
                  <li>Potentially log out all users</li>
                </ul>
                <p><strong>Are you absolutely sure you want to continue?</strong></p>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowRestoreModal(false)}
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger"
                onClick={restoreBackup}
                disabled={loading}
              >
                {loading ? 'Restoring...' : 'Yes, Restore Database'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatabaseBackup;