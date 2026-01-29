import React, { useState, useEffect } from 'react';
import '../styles/TemplateHistoryModal.css';

const TemplateHistoryModal = ({ templateID, templateName, onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTemplateHistory();
  }, [templateID]);

  const fetchTemplateHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        'https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/getTemplateHistory',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ templateID })
        }
      );

      const data = await response.json();
      
      if (response.ok) {
        const parsedData = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
        setHistory(parsedData.history || []);
      } else {
        setError('Failed to fetch template history');
      }
    } catch (err) {
      setError('Error loading template history');
      console.error('Error fetching template history:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionIcon = (action) => {
    const iconStyle = {
      width: '24px',
      height: '24px',
      display: 'block'
    };

    switch (action) {
      case 'created':
        return (
          <svg style={iconStyle} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'assigned_for_review':
        return (
          <svg style={iconStyle} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8.5 11C10.7091 11 12.5 9.20914 12.5 7C12.5 4.79086 10.7091 3 8.5 3C6.29086 3 4.5 4.79086 4.5 7C4.5 9.20914 6.29086 11 8.5 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'approved':
        return (
          <svg style={iconStyle} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M22 4L12 14.01l-3-3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'modified':
        return (
          <svg style={iconStyle} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'assigned_to_recruiter':
        return (
          <svg style={iconStyle} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8.5 11C10.7091 11 12.5 9.20914 12.5 7C12.5 4.79086 10.7091 3 8.5 3C6.29086 3 4.5 4.79086 4.5 7C4.5 9.20914 6.29086 11 8.5 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M20 8V14M17 11H23" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      default:
        return (
          <svg style={iconStyle} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        );
    }
  };

  const getActionLabel = (action) => {
    const labels = {
      'created': 'Template Created',
      'assigned_for_review': 'Assigned for Review',
      'approved': 'Approved',
      'modified': 'Modified',
      'assigned_to_recruiter': 'Assigned to Recruiter'
    };
    return labels[action] || action;
  };

  const renderHistoryDetails = (entry) => {
    const { action, details } = entry;

    switch (action) {
      case 'created':
        return <p className="history-description">Template was created</p>;
      
      case 'assigned_for_review':
        return (
          <div className="history-description">
            <p>Assigned to <strong>{details.assignedToName || details.assignedTo}</strong> for review</p>
            {details.assignedRole && <p className="history-meta">Role: {details.assignedRole === 'hiring_manager' ? 'Reviewer' : 'Recruiter'}</p>}
          </div>
        );
      
      case 'approved':
        return (
          <div className="history-description">
            <p>Template approved</p>
            {details.approverComments && <p className="history-meta">Comments: {details.approverComments}</p>}
          </div>
        );
      
      case 'modified':
        return (
          <div className="history-description">
            <p>Template modified</p>
            {details.modifications && <p className="history-meta">{details.modifications}</p>}
          </div>
        );
      
      case 'assigned_to_recruiter':
        return (
          <div className="history-description">
            <p>Assigned to <strong>{details.assignedToName || details.assignedTo}</strong> as recruiter</p>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="template-history-modal-overlay" onClick={onClose}>
      <div className="template-history-modal" onClick={(e) => e.stopPropagation()}>
        <div className="template-history-header">
          <div className="template-history-header-content">
            <h2>Template History</h2>
            <p className="template-history-subtitle">{templateName}</p>
          </div>
          <button className="template-history-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="template-history-content">
          {loading ? (
            <div className="template-history-loading">
              <svg className="spin-animation" width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2V6M12 18V22M6 12H2M22 12H18M19.07 4.93L16.24 7.76M7.76 16.24L4.93 19.07M19.07 19.07L16.24 16.24M7.76 7.76L4.93 4.93" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p>Loading history...</p>
            </div>
          ) : error ? (
            <div className="template-history-error">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 8V12M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p>{error}</p>
            </div>
          ) : history.length === 0 ? (
            <div className="template-history-empty">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 8V12L15 15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p>No history available for this template</p>
            </div>
          ) : (
            <div className="template-history-timeline">
              {history.map((entry, index) => (
                <div key={index} className="history-entry">
                  <div className="history-icon">
                    {getActionIcon(entry.action)}
                  </div>
                  <div className="history-content">
                    <div className="history-header">
                      <h3>{getActionLabel(entry.action)}</h3>
                      <span className="history-time">{formatDate(entry.timestamp)}</span>
                    </div>
                    <p className="history-performer">
                      By <strong>{entry.performedByName || entry.performedBy}</strong>
                    </p>
                    {renderHistoryDetails(entry)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TemplateHistoryModal;
