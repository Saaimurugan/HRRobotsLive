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
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({})
        }
      );

      if (response.status === 403) {
        throw new Error('Access denied. Admin access required. Please ensure you are logged in as saaimurugan@gmail.com');
      }

      if (response.status === 401) {
        throw new Error('Unauthorized. Your session may have expired. Please log in again.');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch admin data (${response.status})`);
      }

      let data = await response.json();
      
      // If response has a 'body' property (Lambda Proxy format), parse it
      if (typeof data.body === 'string') {
        data = JSON.parse(data.body);
      }
      
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
          <p className="stat-value">{adminData?.totalUsers || 0}</p>
          <p className="stat-detail">Users created today: {adminData?.usersCreatedToday || 0}</p>
          <p className="stat-detail">Users created this week: {adminData?.usersCreatedThisWeek || 0}</p>
        </div>

        <div className="stat-card">
          <h3>Total Templates</h3>
          <p className="stat-value">{adminData?.totalTemplates || 0}</p>
          <p className="stat-detail">Templates created today: {adminData?.templatesCreatedToday || 0}</p>
          <p className="stat-detail">Templates created this week: {adminData?.templatesCreatedThisWeek || 0}</p>
        </div>

        <div className="stat-card">
          <h3>Total Test Transactions</h3>
          <p className="stat-value">{adminData?.totalTestTransactions || 0}</p>
          <p className="stat-detail">Tests created today: {adminData?.testTransactionsCreatedToday || 0}</p>
          <p className="stat-detail">Tests created this week: {adminData?.testTransactionsCreatedThisWeek || 0}</p>
        </div>

        <div className="stat-card">
          <h3>Active Users</h3>
          <p className="stat-value">{adminData?.activeUsers || 0}</p>
          <p className="stat-detail">Currently logged in</p>
        </div>
      </div>

      {/* Users Section */}
      <div className="admin-section">
        <h2>Users ({adminData?.users?.length || 0})</h2>
        <div className="users-list">
          {adminData?.users && adminData.users.length > 0 ? (
            adminData.users.map((user) => (
              <div key={user.userId} className="user-card">
                <div 
                  className="user-header"
                  onClick={() => setExpandedUser(expandedUser === user.userId ? null : user.userId)}
                >
                  <div className="user-info">
                    <h3>{user.userId}</h3>
                    <p className="user-meta">
                      Created: {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
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
                    <p><strong>Templates Created:</strong> {user.templateCount || 0}</p>
                    <p><strong>Tests Taken:</strong> {user.testCount || 0}</p>
                    <p><strong>Last Active:</strong> {user.lastActive ? new Date(user.lastActive).toLocaleString() : 'Never'}</p>

                    {/* Test Count by Status */}
                    {user.testCountByStatus && (
                      <div className="test-status-summary">
                        <h4>Test Count by Status</h4>
                        <div className="status-grid">
                          <div className="status-item">
                            <span className="status-label">Completed</span>
                            <span className="status-count completed">{user.testCountByStatus.completed || 0}</span>
                          </div>
                          <div className="status-item">
                            <span className="status-label">Pending</span>
                            <span className="status-count pending">{user.testCountByStatus.pending || 0}</span>
                          </div>
                          <div className="status-item">
                            <span className="status-label">Failed</span>
                            <span className="status-count failed">{user.testCountByStatus.failed || 0}</span>
                          </div>
                          <div className="status-item">
                            <span className="status-label">In Progress</span>
                            <span className="status-count in_progress">{user.testCountByStatus.in_progress || 0}</span>
                          </div>
                        </div>
                      </div>
                    )}

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
                                  Created: {template.datetime ? new Date(template.datetime).toLocaleDateString() : 'N/A'}
                                </p>
                              </div>
                              <span className="expand-icon">
                                {expandedTemplate === template.templateID ? '▼' : '▶'}
                              </span>
                            </div>

                            {expandedTemplate === template.templateID && (
                              <div className="template-details">
                                <p><strong>Questions:</strong> {template.questionCount || 0}</p>
                                <p><strong>Test Transactions:</strong> {template.testTransactionCount || 0}</p>

                                {/* Test Transactions under this template */}
                                {template.testTransactions && template.testTransactions.length > 0 && (
                                  <div className="nested-section">
                                    <h5>Test Transactions ({template.testTransactions.length})</h5>
                                    <div className="transactions-list">
                                      {template.testTransactions.map((transaction) => (
                                        <div key={transaction.testID} className="transaction-item">
                                          <p><strong>Candidate:</strong> {transaction.candidateName || 'N/A'}</p>
                                          <p><strong>Email:</strong> {transaction.email || 'N/A'}</p>
                                          <p><strong>Status:</strong> <span className={`status-${transaction.status}`}>{transaction.status || 'unknown'}</span></p>
                                          <p><strong>Date:</strong> {transaction.datetime ? new Date(transaction.datetime).toLocaleString() : 'N/A'}</p>
                                          {transaction.score !== undefined && transaction.score !== null && (
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
            ))
          ) : (
            <p>No users found</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
