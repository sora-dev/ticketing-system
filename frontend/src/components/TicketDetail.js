import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../utils/api';
import './TicketDetail.css';

const TicketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    fetchTicket();
  }, [id]);

  const fetchTicket = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/tickets/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setTicket(response.data);
    } catch (error) {
      console.error('Error fetching ticket:', error);
      if (error.response?.status === 404) {
        alert('Ticket not found');
        navigate('/tickets');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setUpdatingStatus(true);
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_BASE_URL}/api/tickets/${id}`, 
        { status: newStatus },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      setTicket(prev => ({ ...prev, status: newStatus }));
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating ticket status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    setSubmittingComment(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_BASE_URL}/api/tickets/${id}/comments`, 
        { message: newComment },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      setTicket(response.data);
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Error adding comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return '#dc3545';
      case 'high': return '#fd7e14';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return '#007bff';
      case 'in-progress': return '#ffc107';
      case 'resolved': return '#28a745';
      case 'closed': return '#6c757d';
      default: return '#6c757d';
    }
  };

  if (loading) {
    return <div className="loading">Loading ticket...</div>;
  }

  if (!ticket) {
    return <div className="error">Ticket not found</div>;
  }

  return (
    <div className="ticket-detail">
      <div className="ticket-detail-header">
        <button className="back-btn" onClick={() => navigate('/tickets')}>
          ← Back to Tickets
        </button>
        <h1>Ticket #{ticket._id.slice(-6)}</h1>
      </div>

      <div className="ticket-content">
        <div className="ticket-main">
          <div className="ticket-info">
            <h2>{ticket.title}</h2>
            <div className="ticket-badges">
              <span 
                className="badge priority"
                style={{ backgroundColor: getPriorityColor(ticket.priority) }}
              >
                {ticket.priority} Priority
              </span>
              <span 
                className="badge status"
                style={{ backgroundColor: getStatusColor(ticket.status) }}
              >
                {ticket.status}
              </span>
              <span className="badge category">
                {ticket.category}
              </span>
            </div>
            <div className="ticket-description">
              <h3>Description</h3>
              <p>{ticket.description}</p>
            </div>
          </div>

          <div className="ticket-comments">
            <h3>Comments ({ticket.comments?.length || 0})</h3>
            <div className="comments-list">
              {ticket.comments?.map((comment, index) => (
                <div key={index} className="comment">
                  <div className="comment-header">
                    <strong>{comment.user?.name || 'Unknown User'}</strong>
                    <span className="comment-date">
                      {new Date(comment.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="comment-message">{comment.message}</p>
                </div>
              ))}
            </div>
            
            <form onSubmit={handleAddComment} className="add-comment-form">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                rows="3"
                required
              />
              <button 
                type="submit" 
                className="btn-primary"
                disabled={submittingComment}
              >
                {submittingComment ? 'Adding...' : 'Add Comment'}
              </button>
            </form>
          </div>
        </div>

        <div className="ticket-sidebar">
          <div className="ticket-meta">
            <h3>Ticket Information</h3>
            <div className="meta-item">
              <label>Created By:</label>
              <span>{ticket.createdBy?.name || 'Unknown'}</span>
            </div>
            <div className="meta-item">
              <label>Created:</label>
              <span>{new Date(ticket.createdAt).toLocaleString()}</span>
            </div>
            <div className="meta-item">
              <label>Last Updated:</label>
              <span>{new Date(ticket.updatedAt).toLocaleString()}</span>
            </div>
            {ticket.assignedTo && (
              <div className="meta-item">
                <label>Assigned To:</label>
                <span>{ticket.assignedTo.name}</span>
              </div>
            )}
          </div>

          <div className="status-controls">
            <h3>Update Status</h3>
            <select
              value={ticket.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={updatingStatus}
              className="status-select"
            >
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketDetail;