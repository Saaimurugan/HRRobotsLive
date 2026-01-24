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
  const [selectedActionFilter, setSelectedActionFilter] = useState('all');
  const [selectedUserFilter, setSelectedUserFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [logsDays, setLogsDays] = useState(7);
  const [uniqueUsers, setUniqueUsers] = useState([]);
  const [uniqueActions, setUniqueActions] = useState([]);
  const [uniqueActivities, setUniqueActivities] = useState([]);

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
          limit: 1000
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch activity logs (${response.status})`);
      }

      const data = await response.json();
      const parsedData = typeof data.body === 'string' ? JSON.parse(data.body) : data;
      
      console.log('[AdminDashboard] Activity logs loaded:', parsedData.logs?.length);
      setActivityLogs(parsedData.logs || []);
      
      // Extract unique values for filters
      if (parsedData.logs && parsedData.logs.length > 0) {
        const users = [...new Set(parsedData.logs.map(log => log.email))].sort();
        const actions = [...new Set(parsedData.logs.map(log => log.action))].sort();
        const activities = [...new Set(parsedData.logs.map(log => log.activity))].sort();
        
        setUniqueUsers(users);
        setUniqueActions(actions);
        setUniqueActivities(activities);
      }
      
      setLogsError(null);
    } catch (err) {
      console.error('[AdminDashboard] Error fetching activity logs:', err);
      setLogsError(err.message);
    } finally {
      setLogsLoading(false);
    }
  };

  // Filter logs based on selected filters
  const getFilteredLogs = () => {
    return activityLogs.filter(log => {
      const matchesActivity = selectedActivityFilter === 'all' || log.activity === selectedActivityFilter;
      const matchesAction = selectedActionFilter === 'all' || log.action === selectedActionFilter;
      const matchesUser = selectedUserFilter === 'all' || log.email === selectedUserFilter;
      const matchesStatus = selectedStatusFilter === 'all' || log.details?.status === selectedStatusFilter;
      
      return matchesActivity && matchesAction && matchesUser && matchesStatus;
    });
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
          <button 
            onClick={fetchActivityLogs}
            style={{ padding: '8px 16px', borderRadius: '4px', background: '#2563eb', color: 'white', border: 'none', cursor: 'pointer' }}
          >
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '12px', 
          marginBottom: '20px',
          padding: '16px',
          background: '#f8fafc',
          borderRadius: '8px',
          border: '1px solid #e2e8f0'
        }}>
          {/* User Filter */}
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '12px', color: '#4b5563' }}>
              User
            </label>
            <select 
              value={selectedUserFilter} 
              onChange={(e) => setSelectedUserFilter(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '8px 12px', 
                borderRadius: '4px', 
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Users</option>
              {uniqueUsers.map(user => (
                <option key={user} value={user}>{user}</option>
              ))}
            </select>
          </div>

          {/* Activity Filter */}
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '12px', color: '#4b5563' }}>
              Activity
            </label>
            <select 
              value={selectedActivityFilter} 
              onChange={(e) => setSelectedActivityFilter(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '8px 12px', 
                borderRadius: '4px', 
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Activities</option>
              <option value="CreateJD">Create JD</option>
              <option value="ProfilerPage">Profiler Page</option>
              <option value="CandidateSpecificTest">Candidate Test</option>
              <option value="Login">Login</option>
              <option value="Logout">Logout</option>
              <option value="Configuration">Configuration</option>
              <option value="Assign">Assign</option>
              <option value="GenerateTestLink">Generate Test Link</option>
              <option value="EditTemplate">Edit Template</option>
              <option value="Report">Report</option>
              {uniqueActivities.map(activity => (
                !['CreateJD', 'ProfilerPage', 'CandidateSpecificTest', 'Login', 'Logout', 'Configuration', 'Assign', 'GenerateTestLink', 'EditTemplate', 'Report'].includes(activity) && (
                  <option key={activity} value={activity}>{activity}</option>
                )
              ))}
            </select>
          </div>

          {/* Action Filter */}
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '12px', color: '#4b5563' }}>
              Action
            </label>
            <select 
              value={selectedActionFilter} 
              onChange={(e) => setSelectedActionFilter(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '8px 12px', 
                borderRadius: '4px', 
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Actions</option>
              {uniqueActions.map(action => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '12px', color: '#4b5563' }}>
              Status
            </label>
            <select 
              value={selectedStatusFilter} 
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '8px 12px', 
                borderRadius: '4px', 
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Status</option>
              <option value="success">Success</option>
              <option value="error">Error</option>
              <option value="warning">Warning</option>
            </select>
          </div>

          {/* Time Period Filter */}
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '12px', color: '#4b5563' }}>
              Time Period
            </label>
            <select 
              value={logsDays} 
              onChange={(e) => setLogsDays(parseInt(e.target.value))}
              style={{ 
                width: '100%', 
                padding: '8px 12px', 
                borderRadius: '4px', 
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              <option value={1}>Last 24 hours</option>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button 
              onClick={() => {
                setSelectedUserFilter('all');
                setSelectedActivityFilter('all');
                setSelectedActionFilter('all');
                setSelectedStatusFilter('all');
                setLogsDays(7);
              }}
              style={{ 
                width: '100%', 
                padding: '8px 12px', 
                borderRadius: '4px', 
                background: '#e2e8f0', 
                color: '#2d3748', 
                border: 'none', 
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Clear Filters
            </button>
          </div>
        </div>

        {logsLoading && <p>Loading activity logs...</p>}
        {logsError && <p style={{ color: 'red' }}>Error: {logsError}</p>}

        {(() => {
          const filteredLogs = getFilteredLogs();
          return filteredLogs.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <p style={{ marginBottom: '12px', color: '#666', fontSize: '14px' }}>
                Showing {filteredLogs.length} of {activityLogs.length} logs
              </p>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px' }}>User</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px' }}>Activity</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px' }}>Action</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px' }}>Duration (ms)</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px' }}>Timestamp</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '13px' }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.logId} style={{ borderBottom: '1px solid #e2e8f0', hover: { background: '#f9fafb' } }}>
                      <td style={{ padding: '12px', fontSize: '13px' }}>
                        <span style={{ 
                          padding: '4px 8px', 
                          background: '#e0e7ff', 
                          color: '#3730a3',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}>
                          {log.email}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontSize: '13px' }}>
                        <span style={{ 
                          padding: '4px 8px', 
                          background: '#dbeafe', 
                          color: '#1e40af',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}>
                          {log.activity}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontSize: '13px' }}>
                        <span style={{ 
                          padding: '4px 8px', 
                          background: '#f3e8ff', 
                          color: '#6b21a8',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          background: log.details?.status === 'success' ? '#d1fae5' : log.details?.status === 'error' ? '#fee2e2' : '#fef3c7',
                          color: log.details?.status === 'success' ? '#065f46' : log.details?.status === 'error' ? '#7f1d1d' : '#92400e',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}>
                          {log.details?.status || 'unknown'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontSize: '13px', color: '#666' }}>
                        {log.details?.duration || '-'}
                      </td>
                      <td style={{ padding: '12px', fontSize: '12px', color: '#666' }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td style={{ padding: '12px', fontSize: '12px', maxWidth: '300px', wordBreak: 'break-word' }}>
                        {log.details?.errorMessage && (
                          <span style={{ color: '#dc2626', fontWeight: '500' }}>
                            Error: {log.details.errorMessage}
                          </span>
                        )}
                        {log.details?.roleName && <div>Role: {log.details.roleName}</div>}
                        {log.details?.candidateName && <div>Candidate: {log.details.candidateName}</div>}
                        {log.details?.suitability && <div>Suitability: {log.details.suitability}</div>}
                        {log.details?.templateName && <div>Template: {log.details.templateName}</div>}
                        {log.details?.assignedEmail && <div>Assigned to: {log.details.assignedEmail}</div>}
                        {log.details?.assignedRole && <div>Role: {log.details.assignedRole}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>No activity logs found matching the selected filters</p>
          );
        })()}
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
