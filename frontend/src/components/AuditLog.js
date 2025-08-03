import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/api';
import './AuditLog.css';

const AuditLog = () => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    action: '',
    user: '',
    dateFrom: '',
    dateTo: '',
    page: 1,
    limit: 20
  });
  const [totalPages, setTotalPages] = useState(1);
  const [userSearchTerm, setUserSearchTerm] = useState(''); // Separate state for user search

  // Real-time search with short debounce for user search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setFilters(prev => ({
        ...prev,
        user: userSearchTerm,
        page: 1
      }));
    }, 300); // Reduced to 300ms for more responsive search

    return () => clearTimeout(timeoutId);
  }, [userSearchTerm]);

  useEffect(() => {
    fetchAuditLogs();
  }, [filters]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          queryParams.append(key, filters[key]);
        }
      });

      const response = await fetch(`${API_BASE_URL}/api/audit?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAuditLogs(data.logs || []);
        setTotalPages(data.totalPages || 1);
      } else {
        setError('Failed to fetch audit logs');
      }
    } catch (err) {
      setError('Error fetching audit logs: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    
    // Handle user search separately for real-time search
    if (name === 'user') {
      setUserSearchTerm(value);
      return;
    }
    
    setFilters(prev => ({
      ...prev,
      [name]: value,
      page: 1 // Reset to first page when filtering
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const exportToCSV = () => {
    // Helper function to escape CSV fields
    const escapeCSVField = (field) => {
      if (field === null || field === undefined) {
        return '';
      }
      const stringField = String(field);
      // If field contains comma, quote, or newline, wrap in quotes and escape internal quotes
      if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n') || stringField.includes('\r')) {
        return '"' + stringField.replace(/"/g, '""') + '"';
      }
      return stringField;
    };

    const csvContent = [
      ['Timestamp', 'User', 'Action', 'Resource', 'Details', 'IP Address'].map(escapeCSVField).join(','),
      ...auditLogs.map(log => [
        new Date(log.timestamp).toLocaleString(),
        log.user?.name || 'System',
        log.action,
        log.resource,
        log.details,
        log.ipAddress || 'N/A'
      ].map(escapeCSVField).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getActionColor = (action) => {
    switch (action.toLowerCase()) {
      case 'create': return '#28a745';
      case 'update': return '#ffc107';
      case 'delete': return '#dc3545';
      case 'login': return '#17a2b8';
      case 'logout': return '#6c757d';
      default: return '#007bff';
    }
  };

  if (loading) {
    return (
      <div className="audit-log">
        <div className="loading">Loading audit logs...</div>
      </div>
    );
  }

  return (
    <div className="audit-log">
      <div className="audit-header">
        <h2>🔍 Audit Log Report</h2>
        <button className="export-btn" onClick={exportToCSV}>
          📊 Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="audit-filters">
        <div className="filter-row">
          <div className="filter-group">
            <label>Action:</label>
            <select name="action" value={filters.action} onChange={handleFilterChange}>
              <option value="">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
            </select>
          </div>
          <div className="filter-group">
            <label>User:</label>
            <input
              type="text"
              name="user"
              value={userSearchTerm}
              onChange={handleFilterChange}
              placeholder="Search by user name"
            />
          </div>
          <div className="filter-group">
            <label>From Date:</label>
            <input
              type="date"
              name="dateFrom"
              value={filters.dateFrom}
              onChange={handleFilterChange}
            />
          </div>
          <div className="filter-group">
            <label>To Date:</label>
            <input
              type="date"
              name="dateTo"
              value={filters.dateTo}
              onChange={handleFilterChange}
            />
          </div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Audit Log Table */}
      <div className="audit-table-container">
        <table className="audit-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Action</th>
              <th>Resource</th>
              <th>Details</th>
              <th>IP Address</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.length === 0 ? (
              <tr>
                <td colSpan="6" className="no-data">No audit logs found</td>
              </tr>
            ) : (
              auditLogs.map((log, index) => (
                <tr key={index}>
                  <td>{new Date(log.timestamp).toLocaleString()}</td>
                  <td>{log.user?.name || 'System'}</td>
                  <td>
                    <span 
                      className="action-badge" 
                      style={{ backgroundColor: getActionColor(log.action) }}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td>{log.resource}</td>
                  <td className="details-cell">{log.details}</td>
                  <td>{log.ipAddress}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button 
            onClick={() => handlePageChange(filters.page - 1)}
            disabled={filters.page === 1}
          >
            Previous
          </button>
          <span>Page {filters.page} of {totalPages}</span>
          <button 
            onClick={() => handlePageChange(filters.page + 1)}
            disabled={filters.page === totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default AuditLog;