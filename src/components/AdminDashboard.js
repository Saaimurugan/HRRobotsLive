import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobalContext } from '../globalContext';
import '../styles/AdminDashboard.css';

const ADMIN_EMAIL = 'saaimurugan@gmail.com';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { globalValue } = useGlobalContext();
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedUser, setExpandedUser] = useState(null);
  const [expandedTemplate, setExpandedTemplate] = useState(null);

  // Check admin access on mount
  useEffect(() => {
    if (!globalValue || globalValue.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      navigate('/list');
      return;
    }
    fetchAdminData();
  }, [globalValue, navigate]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem('jwtSession');
      
      const response = await fetch(
        'https://boy6gvghjj.execute-api.us-east-1.amazonaws.com/dev/getAdminDashboard',
        {
          method: 'GET',
          headers: {
            'Authorization': token,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch admin data');
      }

      const data = await response.json();
      setAdminData(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="spinner"></div>
        <p>Loading admin dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-error">
        <p>Error: {error}</p>
        <button onClick={fetchAdminData}>Retry</button>
      </div>
    );
  }

  if (!adminData) {
    return <div className="admin-error"><p>No data available</p></div>;
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <button className="refresh-btn" onClick={fetchAdminData}>
          🔄 Refresh
        </button>
      </div>

      {/* Summary Stats */}
      <div className="admin-summary">
        <div className="stat-card">
          <h3>Total Users</h3>
          <p className="stat-value">{adminData.totalUsers}</p>
          <p className="stat-detail">Users created today: {adminData.usersCreatedToday}</p>
          <p className="stat-detail">Users created this week: {adminData.usersCreatedThisWeek}</p>
        </div>

        <div className="stat-card">
          <h3>Total Templates</h3>
          <p className="stat-value">{adminData.totalTemplates}</p>
          <p className="stat-detail">Templates created today: {adminData.templatesCreatedToday}</p>
          <p className="stat-detail">Templates created this week: {adminData.templatesCreatedThisWeek}</p>
        </div>

        <div className="stat-card">
          <h3>Total Test Transactions</h3>
          <p className="stat-value">{adminData.totalTestTransactions}</p>
          <p className="stat-detail">Tests created today: {adminData.testTransactionsCreatedToday}</p>
          <p className="stat-detail">Tests created this week: {adminData.testTransactionsCreatedThisWeek}</p>
        </div>

        <div className="stat-card">
          <h3>Active Users</h3>
          <p className="stat-value">{adminData.activeUsers}</p>
          <p className="stat-detail">Currently logged in</p>
        </div>
      </div>

      {/* Users Section */}
      <div className="admin-section">
        <h2>Users ({adminData.users.length})</h2>
        <div className="users-list">
          {adminData.users.map((user) => (
            <div key={user.userId} className="user-card">
              <div 
                className="user-header"
                onClick={() => setExpandedUser(expandedUser === user.userId ? null : user.userId)}
              >
                <div className="user-info">
                  <h3>{user.userId}</h3>
                  <p className="user-meta">
                    Created: {new Date(user.createdAt).toLocaleDateString()}
                    {user.isActive && <span className="active-badge">Active</span>}
                  </p>
                </div>
                <span className="expand-icon">
                  {expandedUser === user.userId ? '▼' : '▶'}
                </span>
              </div>

              {expandedUser === user.userId && (
                <div className="user-details">
                  <p><strong>Email Verified:</strong> {user.isVerified ? 'Yes' : 'No'}</p>
                  <p><strong>Templates Created:</strong> {user.templateCount}</p>
                  <p><strong>Tests Taken:</strong> {user.testCount}</p>
                  <p><strong>Last Active:</strong> {user.lastActive ? new Date(user.lastActive).toLocaleString() : 'Never'}</p>

                  {/* Templates under this user */}
                  {user.templates && user.templates.length > 0 && (
                    <div className="nested-section">
                      <h4>Templates ({user.templates.length})</h4>
                      {user.templates.map((template) => (
                        <div key={template.templateID} className="template-card">
                          <div 
                            className="template-header"
                            onClick={() => setExpandedTemplate(
                              expandedTemplate === template.templateID ? null : template.templateID
                            )}
                          >
                            <div>
                              <h5>{template.templateName}</h5>
                              <p className="template-meta">
                                Created: {new Date(template.datetime).toLocaleDateString()}
                              </p>
                            </div>
                            <span className="expand-icon">
                              {expandedTemplate === template.templateID ? '▼' : '▶'}
                            </span>
                          </div>

                          {expandedTemplate === template.templateID && (
                            <div className="template-details">
                              <p><strong>Questions:</strong> {template.questionCount}</p>
                              <p><strong>Test Transactions:</strong> {template.testTransactionCount}</p>

                              {/* Test Transactions under this template */}
                              {template.testTransactions && template.testTransactions.length > 0 && (
                                <div className="nested-section">
                                  <h5>Test Transactions ({template.testTransactions.length})</h5>
                                  <div className="transactions-list">
                                    {template.testTransactions.map((transaction) => (
                                      <div key={transaction.testID} className="transaction-item">
                                        <p><strong>Candidate:</strong> {transaction.candidateName}</p>
                                        <p><strong>Email:</strong> {transaction.email}</p>
                                        <p><strong>Status:</strong> <span className={`status-${transaction.status}`}>{transaction.status}</span></p>
                                        <p><strong>Date:</strong> {new Date(transaction.datetime).toLocaleString()}</p>
                                        {transaction.score !== undefined && (
                                          <p><strong>Score:</strong> {transaction.score}%</p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
