import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalTickets: 0,
    openTickets: 0,
    inProgressTickets: 0,
    resolvedTickets: 0,
    urgentTickets: 0,
  });
  const [recentTickets, setRecentTickets] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/tickets/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setStats(response.data.stats);
      setRecentTickets(response.data.recentTickets);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      
      <div className="stats-grid">
        <div className="stat-card total">
          <h3>Total Tickets</h3>
          <p className="stat-number">{stats.totalTickets}</p>
        </div>
        <div className="stat-card open">
          <h3>Open Tickets</h3>
          <p className="stat-number">{stats.openTickets}</p>
        </div>
        <div className="stat-card progress">
          <h3>In Progress</h3>
          <p className="stat-number">{stats.inProgressTickets}</p>
        </div>
        <div className="stat-card resolved">
          <h3>Resolved</h3>
          <p className="stat-number">{stats.resolvedTickets}</p>
        </div>
        <div className="stat-card urgent">
          <h3>Urgent</h3>
          <p className="stat-number">{stats.urgentTickets}</p>
        </div>
      </div>

      <div className="recent-tickets">
        <h2>Recent Tickets</h2>
        <div className="tickets-table">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {recentTickets.map(ticket => (
                <tr key={ticket._id}>
                  <td>#{ticket._id.slice(-6)}</td>
                  <td>{ticket.title}</td>
                  <td>
                    <span className={`priority ${ticket.priority}`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td>
                    <span className={`status ${ticket.status}`}>
                      {ticket.status}
                    </span>
                  </td>
                  <td>{new Date(ticket.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;