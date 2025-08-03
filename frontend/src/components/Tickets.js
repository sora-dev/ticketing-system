import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../utils/api';
import './Tickets.css';

const Tickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/tickets`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setTickets(response.data);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTicketStatus = async (ticketId, newStatus, e) => {
    e.stopPropagation(); // Prevent card click when changing status
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API_BASE_URL}/api/tickets/${ticketId}`, 
        { status: newStatus },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      fetchTickets(); // Refresh the list
    } catch (error) {
      console.error('Error updating ticket status:', error);
    }
  };

  const handleTicketClick = (ticketId) => {
    navigate(`/tickets/${ticketId}`);
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesFilter = filter === 'all' || ticket.status === filter;
    const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return <div className="loading">Loading tickets...</div>;
  }

  return (
    <div className="tickets-page">
      <div className="tickets-header">
        <h1>Tickets</h1>
        <button 
          className="btn-primary"
          onClick={() => navigate('/tickets/create')}
        >
          Create New Ticket
        </button>
      </div>

      <div className="tickets-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search tickets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="filter-tabs">
          <button 
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({tickets.length})
          </button>
          <button 
            className={`filter-tab ${filter === 'open' ? 'active' : ''}`}
            onClick={() => setFilter('open')}
          >
            Open ({tickets.filter(t => t.status === 'open').length})
          </button>
          <button 
            className={`filter-tab ${filter === 'in-progress' ? 'active' : ''}`}
            onClick={() => setFilter('in-progress')}
          >
            In Progress ({tickets.filter(t => t.status === 'in-progress').length})
          </button>
          <button 
            className={`filter-tab ${filter === 'resolved' ? 'active' : ''}`}
            onClick={() => setFilter('resolved')}
          >
            Resolved ({tickets.filter(t => t.status === 'resolved').length})
          </button>
        </div>
      </div>

      <div className="tickets-grid">
        {filteredTickets.length === 0 ? (
          <div className="no-tickets">
            <p>No tickets found.</p>
          </div>
        ) : (
          filteredTickets.map(ticket => (
            <div 
              key={ticket._id} 
              className="ticket-card clickable"
              onClick={() => handleTicketClick(ticket._id)}
            >
              <div className="ticket-header">
                <h3>{ticket.title}</h3>
                <span className={`priority ${ticket.priority}`}>
                  {ticket.priority}
                </span>
              </div>
              
              <p className="ticket-description">{ticket.description}</p>
              
              <div className="ticket-meta">
                <span className="ticket-category">{ticket.category}</span>
                <span className="ticket-date">
                  {new Date(ticket.createdAt).toLocaleDateString()}
                </span>
              </div>
              
              <div className="ticket-footer">
                <span className={`status ${ticket.status}`}>
                  {ticket.status}
                </span>
                
                <div className="ticket-actions">
                  {ticket.status !== 'resolved' && (
                    <select
                      value={ticket.status}
                      onChange={(e) => updateTicketStatus(ticket._id, e.target.value, e)}
                      className="status-select"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="open">Open</option>
                      <option value="in-progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Tickets;