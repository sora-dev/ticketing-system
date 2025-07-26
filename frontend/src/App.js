import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Homepage from './components/Homepage';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Tickets from './components/Tickets';
import CreateTicket from './components/CreateTicket';
import UserManagement from './components/UserManagement';
import KnowledgeBaseAdmin from './components/KnowledgeBaseAdmin';
import KnowledgeBase from './components/KnowledgeBase';
import TicketDetail from './components/TicketDetail';
import AuditLog from './components/AuditLog';
import SystemConfig from './components/SystemConfig';
import Reports from './components/Reports';

import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<Homepage />} />
            <Route path="/login" element={<Login />} />
            
            {/* Protected routes with layout */}
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="admin/dashboard" element={<Dashboard />} />
              <Route path="support/dashboard" element={<Dashboard />} />
              <Route path="user/dashboard" element={<Dashboard />} />
              <Route path="tickets" element={<Tickets />} />
              <Route path="tickets/create" element={<CreateTicket />} />
              <Route path="tickets/:id" element={<TicketDetail />} />
              <Route path="knowledge-base" element={<KnowledgeBase />} />
              <Route path="admin/users" element={<UserManagement />} />
              <Route path="admin/knowledge-base" element={<KnowledgeBaseAdmin />} />
              <Route path="admin/audit-log" element={<AuditLog />} />
              <Route path="/admin/system-config" element={<SystemConfig />} />
              <Route path="reports" element={<Reports />} />
            </Route>
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
