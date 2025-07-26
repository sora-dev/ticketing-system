import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './UserManagement.css';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
    department: '',
  });
  const [editUser, setEditUser] = useState({
    name: '',
    email: '',
    role: 'user',
    department: '',
  });
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [message, setMessage] = useState(''); // Add this
  const [error, setError] = useState(''); // Add this

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/users', newUser, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setNewUser({ name: '', email: '', password: '', role: 'user', department: '' });
      setShowAddUser(false);
      fetchUsers();
    } catch (error) {
      console.error('Error adding user:', error);
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5000/api/users/${selectedUser._id}`, editUser, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setShowEditUser(false);
      setSelectedUser(null);
      fetchUsers();
      alert('User profile updated successfully!');
    } catch (error) {
      console.error('Error updating user:', error);
      alert(error.response?.data?.message || 'Error updating user');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Passwords do not match!');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      alert('Password must be at least 6 characters long!');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`http://localhost:5000/api/users/${selectedUser._id}/password`, 
        { newPassword: passwordData.newPassword },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      setShowChangePassword(false);
      setSelectedUser(null);
      setPasswordData({ newPassword: '', confirmPassword: '' });
      alert('Password changed successfully!');
    } catch (error) {
      console.error('Error changing password:', error);
      alert(error.response?.data?.message || 'Error changing password');
    }
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setEditUser({
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department
    });
    setShowEditUser(true);
    setDropdownOpen(null);
  };

  const openPasswordModal = (user) => {
    setSelectedUser(user);
    setPasswordData({ newPassword: '', confirmPassword: '' });
    setShowChangePassword(true);
    setDropdownOpen(null);
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`http://localhost:5000/api/users/${userId}`, 
        { isActive: !currentStatus },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      fetchUsers();
      setDropdownOpen(null);
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  const toggleDropdown = (userId, event) => {
    event.stopPropagation(); // Prevent event bubbling
    
    if (dropdownOpen === userId) {
      setDropdownOpen(null);
    } else {
      setDropdownOpen(userId);
    }
  };
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setDropdownOpen(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="user-management">
      <div className="header">
        <h1>User Management</h1>
        <button 
          className="btn-primary"
          onClick={() => setShowAddUser(true)}
        >
          Add New User
        </button>
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Add New User</h2>
            <form onSubmit={handleAddUser}>
              <input
                type="text"
                placeholder="Name"
                value={newUser.name}
                onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={newUser.email}
                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={newUser.password}
                onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                required
              />
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({...newUser, role: e.target.value})}
              >
                <option value="user">User</option>
                <option value="support">Support</option>
                <option value="admin">Admin</option>
              </select>
              <input
                type="text"
                placeholder="Department"
                value={newUser.department}
                onChange={(e) => setNewUser({...newUser, department: e.target.value})}
              />
              <div className="modal-actions">
                <button type="submit" className="btn-primary">Add User</button>
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => setShowAddUser(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditUser && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Edit User Profile</h2>
            <form onSubmit={handleEditUser}>
              <input
                type="text"
                placeholder="Name"
                value={editUser.name}
                onChange={(e) => setEditUser({...editUser, name: e.target.value})}
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={editUser.email}
                onChange={(e) => setEditUser({...editUser, email: e.target.value})}
                required
              />
              <select
                value={editUser.role}
                onChange={(e) => setEditUser({...editUser, role: e.target.value})}
              >
                <option value="user">User</option>
                <option value="support">Support</option>
                <option value="admin">Admin</option>
              </select>
              <input
                type="text"
                placeholder="Department"
                value={editUser.department}
                onChange={(e) => setEditUser({...editUser, department: e.target.value})}
              />
              <div className="modal-actions">
                <button type="submit" className="btn-primary">Update User</button>
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => setShowEditUser(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Change Password for {selectedUser?.name}</h2>
            <form onSubmit={handleChangePassword}>
              <input
                type="password"
                placeholder="New Password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                required
                minLength="6"
              />
              <input
                type="password"
                placeholder="Confirm New Password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                required
                minLength="6"
              />
              <div className="modal-actions">
                <button type="submit" className="btn-primary">Change Password</button>
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => setShowChangePassword(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="users-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Department</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user._id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>
                  <span className={`role ${user.role}`}>
                    {user.role}
                  </span>
                </td>
                <td>{user.department}</td>
                <td>
                  <span className={`status ${user.isActive ? 'active' : 'inactive'}`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div className="dropdown-container">
                    <button
                      className="dropdown-toggle"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDropdown(user._id, e); // Pass the event parameter
                      }}
                    >
                      Actions ▼
                    </button>
                    {dropdownOpen === user._id && (
                      <div className="dropdown-menu">
                        <button
                          className="dropdown-item"
                          onClick={() => openEditModal(user)}
                        >
                          <span className="icon">✏️</span> Edit Profile
                        </button>
                        <button
                          className="dropdown-item"
                          onClick={() => openPasswordModal(user)}
                        >
                          <span className="icon">🔑</span> Change Password
                        </button>
                        <button
                          className={`dropdown-item ${user.isActive ? 'deactivate' : 'activate'}`}
                          onClick={() => toggleUserStatus(user._id, user.isActive)}
                        >
                          <span className="icon">{user.isActive ? '🚫' : '✅'}</span>
                          {user.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagement;

// Remove this entire function block:
// const handleResetLockouts = async () => {
//   if (!window.confirm('Are you sure you want to reset all user account lockouts?')) {
//     return;
//   }
// 
//   try {
//     const token = localStorage.getItem('token');
//     const response = await axios.post('http://localhost:5000/api/system-config/reset-lockouts', {}, {
//       headers: { Authorization: `Bearer ${token}` }
//     });
//     
//     // Use setTimeout to prevent rapid DOM updates
//     setTimeout(() => {
//       setMessage(response.data.message);
//       fetchUsers(); // Refresh user list
//     }, 100);
//     
//     setTimeout(() => setMessage(''), 3000);
//   } catch (error) {
//     setError(error.response?.data?.message || 'Failed to reset lockouts');
//   }
// };