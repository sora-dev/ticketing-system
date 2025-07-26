import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Reports.css';

const Reports = () => {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [filters, setFilters] = useState({
    priority: 'all',
    status: 'all',
    category: 'all'
  });
  const [reportData, setReportData] = useState({
    metrics: {
      totalTickets: 0,
      resolvedTickets: 0,
      averageResolutionTime: 0,
      resolutionRate: 0
    },
    chartData: {
      dailyTrends: [],
      statusBreakdown: [],
      priorityBreakdown: [],
      categoryBreakdown: []
    }
  });
  const [loading, setLoading] = useState(false);
  const [categories] = useState([
    'account-management', 'transactions', 'cards', 'loans', 
    'technical-issues', 'security', 'mobile-banking', 
    'online-banking', 'general'
  ]);

  useEffect(() => {
    fetchReportData();
  }, [dateRange, filters]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/tickets/reports', {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          priority: filters.priority !== 'all' ? filters.priority : undefined,
          status: filters.status !== 'all' ? filters.status : undefined,
          category: filters.category !== 'all' ? filters.category : undefined
        },
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setReportData(response.data);
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (field, value) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const exportToCSV = () => {
    const csvData = [
      ['Metric', 'Value'],
      ['Total Tickets', reportData.metrics.totalTickets],
      ['Resolved Tickets', reportData.metrics.resolvedTickets],
      ['Resolution Rate', `${reportData.metrics.resolutionRate}%`],
      ['Average Resolution Time', `${reportData.metrics.averageResolutionTime} hours`],
      [''],
      ['Daily Trends'],
      ['Date', 'Created', 'Resolved'],
      ...reportData.chartData.dailyTrends.map(item => [
        item.date, item.created, item.resolved
      ]),
      [''],
      ['Status Breakdown'],
      ['Status', 'Count'],
      ...reportData.chartData.statusBreakdown.map(item => [
        item.status, item.count
      ])
    ];

    const csvContent = csvData.map(row => 
      row.map(field => `"${field}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ticket-report-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    window.print();
  };

  const renderBarChart = (data, title) => {
    if (!data || data.length === 0) return <div className="no-data">No data available</div>;
    
    const maxValue = Math.max(...data.map(item => item.count || item.created || item.resolved || 0));
    
    return (
      <div className="chart-container">
        <h3>{title}</h3>
        <div className="bar-chart">
          {data.map((item, index) => {
            const value = item.count || item.created || item.resolved || 0;
            const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
            return (
              <div key={index} className="bar-item">
                <div 
                  className="bar" 
                  style={{ height: `${height}%` }}
                  title={`${item.label || item.date || item.status}: ${value}`}
                ></div>
                <span className="bar-label">
                  {item.label || item.date || item.status}
                </span>
                <span className="bar-value">{value}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderPieChart = (data, title) => {
    if (!data || data.length === 0) return <div className="no-data">No data available</div>;
    
    const total = data.reduce((sum, item) => sum + item.count, 0);
    const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe'];
    
    return (
      <div className="chart-container">
        <h3>{title}</h3>
        <div className="pie-chart">
          <div className="pie-visual">
            {data.map((item, index) => {
              const percentage = total > 0 ? (item.count / total) * 100 : 0;
              return (
                <div 
                  key={index} 
                  className="pie-slice"
                  style={{
                    '--percentage': `${percentage}%`,
                    '--color': colors[index % colors.length]
                  }}
                  title={`${item.status}: ${item.count} (${percentage.toFixed(1)}%)`}
                ></div>
              );
            })}
          </div>
          <div className="pie-legend">
            {data.map((item, index) => {
              const percentage = total > 0 ? (item.count / total) * 100 : 0;
              return (
                <div key={index} className="legend-item">
                  <span 
                    className="legend-color" 
                    style={{ backgroundColor: colors[index % colors.length] }}
                  ></span>
                  <span className="legend-text">
                    {item.status}: {item.count} ({percentage.toFixed(1)}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderLineChart = (data, title) => {
    if (!data || data.length === 0) return <div className="no-data">No data available</div>;
    
    const maxValue = Math.max(...data.flatMap(item => [item.created || 0, item.resolved || 0]));
    
    return (
      <div className="chart-container">
        <h3>{title}</h3>
        <div className="line-chart">
          <div className="chart-grid">
            {data.map((item, index) => {
              const createdHeight = maxValue > 0 ? (item.created / maxValue) * 100 : 0;
              const resolvedHeight = maxValue > 0 ? (item.resolved / maxValue) * 100 : 0;
              return (
                <div key={index} className="line-item">
                  <div className="line-bars">
                    <div 
                      className="line-bar created" 
                      style={{ height: `${createdHeight}%` }}
                      title={`Created: ${item.created}`}
                    ></div>
                    <div 
                      className="line-bar resolved" 
                      style={{ height: `${resolvedHeight}%` }}
                      title={`Resolved: ${item.resolved}`}
                    ></div>
                  </div>
                  <span className="line-label">{item.date}</span>
                </div>
              );
            })}
          </div>
          <div className="line-legend">
            <div className="legend-item">
              <span className="legend-color created"></span>
              <span>Created</span>
            </div>
            <div className="legend-item">
              <span className="legend-color resolved"></span>
              <span>Resolved</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="reports">
      <div className="reports-header">
        <h1>📊 Reports & Analytics</h1>
        <div className="export-buttons">
          <button className="btn-secondary" onClick={exportToCSV}>
            📄 Export CSV
          </button>
          <button className="btn-secondary" onClick={exportToPDF}>
            📑 Export PDF
          </button>
        </div>
      </div>

      {/* Date Range and Filters */}
      <div className="filters-section">
        <div className="date-filters">
          <div className="filter-group">
            <label>From Date:</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => handleDateChange('startDate', e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label>To Date:</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => handleDateChange('endDate', e.target.value)}
            />
          </div>
        </div>

        <div className="additional-filters">
          <div className="filter-group">
            <label>Priority:</label>
            <select 
              value={filters.priority} 
              onChange={(e) => handleFilterChange('priority', e.target.value)}
            >
              <option value="all">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Status:</label>
            <select 
              value={filters.status} 
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Category:</label>
            <select 
              value={filters.category} 
              onChange={(e) => handleFilterChange('category', e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading report data...</div>
      ) : (
        <>
          {/* Metrics Summary */}
          <div className="metrics-section">
            <div className="metric-card">
              <h3>Total Tickets</h3>
              <div className="metric-value">{reportData.metrics.totalTickets}</div>
            </div>
            <div className="metric-card">
              <h3>Resolved Tickets</h3>
              <div className="metric-value">{reportData.metrics.resolvedTickets}</div>
            </div>
            <div className="metric-card">
              <h3>Resolution Rate</h3>
              <div className="metric-value">{reportData.metrics.resolutionRate}%</div>
            </div>
            <div className="metric-card">
              <h3>Avg Resolution Time</h3>
              <div className="metric-value">{reportData.metrics.averageResolutionTime}h</div>
            </div>
          </div>

          {/* Charts */}
          <div className="charts-section">
            <div className="chart-row">
              {renderLineChart(reportData.chartData.dailyTrends, "Daily Ticket Trends")}
            </div>
            
            <div className="chart-row">
              {renderPieChart(reportData.chartData.statusBreakdown, "Status Breakdown")}
              {renderBarChart(reportData.chartData.priorityBreakdown, "Priority Distribution")}
            </div>
            
            <div className="chart-row">
              {renderBarChart(reportData.chartData.categoryBreakdown, "Category Breakdown")}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Reports;