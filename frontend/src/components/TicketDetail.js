import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../utils/api';
import './TicketDetail.css';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const TicketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [newCommentHtml, setNewCommentHtml] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingPriority, setUpdatingPriority] = useState(false);
  const quillRef = useRef(null);

  // ReactQuill toolbar configuration with image upload handler
  const modules = {
    toolbar: {
      container: [
        [{ header: [1, 2, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ indent: '-1' }, { indent: '+1' }],
        ['link', 'image'],
        ['clean']
      ],
      handlers: {
        image: async function () {
          const input = document.createElement('input');
          input.setAttribute('type', 'file');
          input.setAttribute('accept', 'image/*');
          input.click();
          input.onchange = async () => {
            const file = input.files[0];
            if (!file) return;
            try {
              const token = localStorage.getItem('token');
              const form = new FormData();
              form.append('image', file);
              const res = await axios.post(`${API_BASE_URL}/api/tickets/upload-image`, form, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'multipart/form-data'
                }
              });
              const url = res.data.url.startsWith('http') ? res.data.url : `${API_BASE_URL}${res.data.url}`;
              const quill = quillRef.current?.getEditor();
              const range = quill.getSelection(true);
              quill.insertEmbed(range.index, 'image', url);
              quill.setSelection(range.index + 1);
            } catch (err) {
              console.error('Image upload failed:', err);
              alert('Image upload failed');
            }
          };
        }
      }
    }
  };

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

  const handlePriorityChange = async (newPriority) => {
    setUpdatingPriority(true);
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_BASE_URL}/api/tickets/${id}`,
        { priority: newPriority },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      setTicket(prev => ({ ...prev, priority: newPriority }));
    } catch (error) {
      console.error('Error updating priority:', error);
      alert('Error updating ticket priority');
    } finally {
      setUpdatingPriority(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() && !newCommentHtml.trim()) return;
    
    setSubmittingComment(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_BASE_URL}/api/tickets/${id}/comments`, 
        { message: newComment, messageHtml: newCommentHtml },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      setTicket(response.data);
      setNewComment('');
      setNewCommentHtml('');
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
          {ticket.descriptionHtml ? (
            <div
              className="ticket-description-html"
              dangerouslySetInnerHTML={{ __html: ticket.descriptionHtml }}
            />
          ) : (
            <p>{ticket.description}</p>
          )}
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
                  {comment.messageHtml ? (
                    <div
                      className="comment-message-html"
                      dangerouslySetInnerHTML={{ __html: comment.messageHtml }}
                    />
                  ) : (
                    <p className="comment-message">{comment.message}</p>
                  )}
                </div>
              ))}
            </div>
            
            <form onSubmit={handleAddComment} className="add-comment-form">
              <div className="form-group">
                <ReactQuill
                  ref={quillRef}
                  value={newCommentHtml}
                  onChange={(content, delta, source, editor) => {
                    setNewCommentHtml(content);
                    setNewComment(editor.getText());
                  }}
                  modules={modules}
                  theme="snow"
                  placeholder="Add a comment..."
                />
              </div>
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

          <div className="priority-controls">
            <h3>Update Priority</h3>
            <select
              value={ticket.priority}
              onChange={(e) => handlePriorityChange(e.target.value)}
              disabled={updatingPriority}
              className="priority-select"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
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