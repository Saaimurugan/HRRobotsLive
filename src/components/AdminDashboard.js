import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobalContext } from '../globalContext';
import AdminCharts from './AdminCharts';
import '../styles/AdminDashboard.css';

const ADMIN_EMAIL = 'saaimurugan@gmail.com';
const ACTIVITY_LOGS_ENDPOINT = 'https://boy6gvghjj.execute-api.us-east-1.amazonaws.com/dev/getActivityLogs';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { globalValue } = useGlobalContext();
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedUser, setExpandedUser] = useState(null);
  const [expandedTemplate, setExpandedTemplate] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState(null);
  const [selectedActivityFilter, setSelectedActivityFilter] = useState('all');
  const [logsDays, setLogsDays] = useState(7);

  // Log component mount
  useEffect(() => {
    console.log('[AdminDashboard] Component mounted');
    console.log('[AdminDashboard] Current user:', globalValue);
    return () => console.log('[AdminDashboard] Component unmounted');
  }, [globalValue]);

  // Check admin access on mount
  useEffect(() => {
    if (!globalValue || globalValue.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      console.warn('[AdminDashboard] Unauthorized access attempt. Current user:', globalValue);
      navigate('/list');
      return;
    }
    console.log('[AdminDashboard] Admin access verified for:', globalValue);
    fetchAdminData();
    fetchActivityLogs();
  }, [globalValue, navigate]);

  const fetchAdminData = async () => {
    try {
      console.log('[AdminDashboard] Fetching admin data...');
      setLoading(true);
      const token = sessionStorage.getItem('jwtSession');
      console.log('[AdminDashboard] JWT token retrieved:', token ? 'Yes' : 'No');
      
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

      console.log('[AdminDashboard] Response status:', response.status);
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
      console.log('[AdminDashboard] Raw response received');
      
      // If response has a 'body' property (Lambda Proxy format), parse it
      if (typeof data.body === 'string') {
        data = JSON.parse(data.body);
      }
      
      console.log('[AdminDashboard] Admin data loaded successfully');
      console.log('[AdminDashboard] Total users:', data?.totalUsers);
      console.log('[AdminDashboard] Total templates:', data?.totalTemplates);
      console.log('[AdminDashboard] Total test transactions:', data?.totalTestTransactions);
      setAdminData(data);
      setError(null);
    } catch (err) {
      console.error('[AdminDashboard] Error fetching admin data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivityLogs = async () => {
    try {
      console.log('[AdminDashboard] Fetching activity logs...');
      setLogsLoading(true);
      const token = sessionStorage.getItem('jwtSession');
      
      const response = await fetch(ACTIVITY_LOGS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          days: logsDays,
          limit: 100,
          activity: selectedActivityFilter !== 'all' ? selectedActivityFilter : undefined
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch activity logs (${response.status})`);
      }

      const data = await response.json();
      const parsedData = typeof data.body === 'string' ? JSON.parse(data.body) : data;
      
      console.log('[AdminDashboard] Activity logs loaded:', parsedData.logs?.length);
      setActivityLogs(parsedData.logs || []);
      setLogsError(null);
    } catch (err) {
      console.error('[AdminDashboard] Error fetching activity logs:', err);
      setLogsError(err.message);
    } finally {
      setLogsLoading(false);
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
    console.error('[AdminDashboard] Rendering error state:', error);
    return (
      <div className="admin-error">
        <p>Error: {error}</p>
        <button onClick={fetchAdminData}>Retry</button>
      </div>
    );
  }

  if (!adminData) {
    console.warn('[AdminDashboard] No admin data available');
    return <div className="admin-error"><p>No data available</p></div>;
  }

  console.log('[AdminDashboard] Rendering dashboard with data');
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

      {/* Charts Section */}
      <AdminCharts adminData={adminData} />

      {/* Activity Logs Section */}
      <div className="admin-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Activity Logs</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            <select 
              value={selectedActivityFilter} 
              onChange={(e) => {
                setSelectedActivityFilter(e.target.value);
              }}
              style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #e2e8f0' }}
            >
              <option value="all">All Activities</option>
              <option value="CreateJD">Create JD</option>
              <option value="ProfilerPage">Profiler Page</option>
              <option value="CandidateSpecificTest">Candidate Test</option>
            </select>
            <select 
              value={logsDays} 
              onChange={(e) => {
                setLogsDays(parseInt(e.target.value));
              }}
              style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #e2e8f0' }}
            >
              <option value={1}>Last 24 hours</option>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
            </select>
            <button 
              onClick={fetchActivityLogs}
              style={{ padding: '8px 16px', borderRadius: '4px', background: '#2563eb', color: 'white', border: 'none', cursor: 'pointer' }}
            >
              Refresh
            </button>
          </div>
        </div>

        {logsLoading && <p>Loading activity logs...</p>}
        {logsError && <p style={{ color: 'red' }}>Error: {logsError}</p>}

        {activityLogs.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>User</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Activity</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Action</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Duration (ms)</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Timestamp</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {activityLogs.map((log) => (
                  <tr key={log.logId} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px' }}>{log.email}</td>
                    <td style={{ padding: '12px' }}>{log.activity}</td>
                    <td style={{ padding: '12px' }}>{log.action}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        background: log.details?.status === 'success' ? '#d1fae5' : log.details?.status === 'error' ? '#fee2e2' : '#fef3c7',
                        color: log.details?.status === 'success' ? '#065f46' : log.details?.status === 'error' ? '#7f1d1d' : '#92400e'
                      }}>
                        {log.details?.status || 'unknown'}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>{log.details?.duration || '-'}</td>
                    <td style={{ padding: '12px', fontSize: '12px' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px', fontSize: '12px' }}>
                      {log.details?.errorMessage && <span style={{ color: 'red' }}>Error: {log.details.errorMessage}</span>}
                      {log.details?.roleName && <span>Role: {log.details.roleName}</span>}
                      {log.details?.candidateName && <span>Candidate: {log.details.candidateName}</span>}
                      {log.details?.suitability && <span>Suitability: {log.details.suitability}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No activity logs found</p>
        )}
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
                  onClick={() => {
                    console.log('[AdminDashboard] Expanding user:', user.userId);
                    setExpandedUser(expandedUser === user.userId ? null : user.userId);
                  }}
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
                              onClick={() => {
                                console.log('[AdminDashboard] Expanding template:', template.templateID);
                                setExpandedTemplate(
                                  expandedTemplate === template.templateID ? null : template.templateID
                                );
                              }}
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
