import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobalContext } from '../globalContext';
import { useSessionHandler } from '../useSessionHandler';
import '../styles/AdminCleanup.css';

const ADMIN_EMAIL = 'saaimurugan@gmail.com';

// Define cleanup functions with their endpoints and descriptions
const CLEANUP_FUNCTIONS = [
  {
    id: 'deleteAllTestTransactions',
    name: 'Delete ALL Test Transactions',
    description: 'CRITICAL: Permanently deletes ALL test transaction records from the database and ALL associated candidate photos from S3. This will remove all test history, candidate submissions, and proctoring photos. This operation cannot be undone.',
    endpoint: 'https://yrtfujcubk4z7pnpynlrfd7isa0farpg.lambda-url.us-east-1.on.aws/',
    confirmMessage: 'This will PERMANENTLY DELETE ALL TEST TRANSACTIONS and ALL ASSOCIATED PHOTOS. This action CANNOT be undone. Are you absolutely certain you want to proceed?',
    warningLevel: 'critical'
  },
  {
    id: 'delAllMCQAnswers',
    name: 'Delete All MCQ Answers',
    description: 'Removes all records from the MCQAnswers table. This is a destructive operation that will delete all stored multiple-choice question answers. Use with extreme caution.',
    endpoint: 'https://5v3zsgkuuipdy7622htjjixofe0aqtag.lambda-url.us-east-1.on.aws/',
    confirmMessage: 'This will permanently delete ALL MCQ answers. Are you absolutely sure?',
    warningLevel: 'critical'
  },
  {
    id: 'delQuestionIfTemplateNotFound',
    name: 'Clean Orphaned Questions',
    description: 'Deletes MCQ questions that reference non-existent templates and removes answers linked to non-existent questions. This helps maintain data integrity by cleaning up orphaned records.',
    endpoint: 'https://llqoitnux26tdtzpfhnktwha4i0jusof.lambda-url.us-east-1.on.aws/',
    confirmMessage: 'This will delete questions without valid templates and their associated answers. Continue?',
    warningLevel: 'high'
  },
  {
    id: 'deleteAllOrphanedQuestions',
    name: 'Delete ALL Orphaned Questions',
    description: 'Comprehensive cleanup: Deletes ALL questions with missing or invalid template references, and ALL answers with missing or invalid question references. More thorough than the standard orphaned questions cleanup.',
    endpoint: 'https://mw5cnwjco4rcvjznxbkgexyuny0dkinf.lambda-url.us-east-1.on.aws/',
    confirmMessage: 'This will perform a comprehensive cleanup of ALL orphaned questions and answers. This is more thorough than the standard cleanup. Continue?',
    warningLevel: 'high'
  },
  {
    id: 'deltestTransactionsIfTemplateNotFound',
    name: 'Clean Orphaned Test Transactions',
    description: 'Removes test transactions that reference templates which no longer exist. This helps keep the testTransactions table clean and prevents issues with missing template references.',
    endpoint: 'https://rnsj7itnilojoqbrbiegjaydbu0yiyeu.lambda-url.us-east-1.on.aws/',
    confirmMessage: 'This will delete test transactions without valid templates. Continue?',
    warningLevel: 'high'
  },
  {
    id: 'delOldPhotoRecords',
    name: 'Clean Orphaned Photo Records',
    description: 'Scans the candidatePhoto table and deletes records where the associated image file no longer exists in the S3 bucket (s3://hrrfiles). This helps maintain database integrity and removes stale photo references.',
    endpoint: 'https://aavtelreorhxcrf25475eva6mm0eaudo.lambda-url.us-east-1.on.aws/',
    confirmMessage: 'This will delete photo records where images are missing from S3. Continue?',
    warningLevel: 'high'
  }
];

const AdminCleanup = () => {
  const navigate = useNavigate();
  const { globalValue, JWTValue } = useGlobalContext();
  const [loading, setLoading] = useState({});
  const [results, setResults] = useState({});
  const [confirmingFunction, setConfirmingFunction] = useState(null);

  // Session handler
  const { checkUnauthorized, checkHttpStatus } = useSessionHandler(null);

  // Check admin access
  React.useEffect(() => {
    if (!globalValue || globalValue.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      console.warn('[AdminCleanup] Unauthorized access attempt. Current user:', globalValue);
      navigate('/list');
    }
  }, [globalValue, navigate]);

  const handleCleanupClick = (cleanupFunction) => {
    setConfirmingFunction(cleanupFunction);
  };

  const handleConfirm = async () => {
    if (!confirmingFunction) return;

    const functionId = confirmingFunction.id;
    setLoading(prev => ({ ...prev, [functionId]: true }));
    setResults(prev => ({ ...prev, [functionId]: null }));

    try {
      console.log(`[AdminCleanup] Calling ${confirmingFunction.name}...`);
      
      const response = await fetch(confirmingFunction.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${JWTValue}`
        },
        body: JSON.stringify({
          token: JWTValue,
          email: globalValue
        })
      });

      console.log(`[AdminCleanup] Response status:`, response.status);

      if (checkHttpStatus(response)) return;

      if (!response.ok) {
        throw new Error(`Failed to execute cleanup function (${response.status})`);
      }

      const data = await response.json();
      console.log(`[AdminCleanup] Response data:`, data);

      if (checkUnauthorized(data)) return;

      // Parse response body if it's a string (Lambda Proxy format)
      let resultData = data;
      if (typeof data.body === 'string') {
        resultData = JSON.parse(data.body);
      } else if (data.body) {
        resultData = data.body;
      }

      setResults(prev => ({
        ...prev,
        [functionId]: {
          success: true,
          data: resultData,
          timestamp: new Date().toISOString()
        }
      }));
    } catch (error) {
      console.error(`[AdminCleanup] Error executing ${confirmingFunction.name}:`, error);
      setResults(prev => ({
        ...prev,
        [functionId]: {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        }
      }));
    } finally {
      setLoading(prev => ({ ...prev, [functionId]: false }));
      setConfirmingFunction(null);
    }
  };

  const handleCancel = () => {
    setConfirmingFunction(null);
  };

  const getWarningIcon = (level) => {
    switch (level) {
      case 'critical':
        return '🚨';
      case 'high':
        return '⚠️';
      default:
        return 'ℹ️';
    }
  };

  const getWarningColor = (level) => {
    switch (level) {
      case 'critical':
        return '#dc2626';
      case 'high':
        return '#ea580c';
      default:
        return '#2563eb';
    }
  };

  return (
    <div className="admin-cleanup">
      <div className="cleanup-header">
        <h1>Database Cleanup Functions</h1>
        <p className="cleanup-subtitle">
          Maintenance utilities for cleaning up orphaned and invalid data
        </p>
      </div>

      <div className="cleanup-warning-banner">
        <span className="warning-icon">⚠️</span>
        <div>
          <strong>Administrator Access Only</strong>
          <p>These functions perform destructive database operations. Please ensure you understand the impact before proceeding.</p>
        </div>
      </div>

      <div className="cleanup-functions-grid">
        {CLEANUP_FUNCTIONS.map((cleanupFunc) => {
          const isLoading = loading[cleanupFunc.id];
          const result = results[cleanupFunc.id];

          return (
            <div key={cleanupFunc.id} className="cleanup-card">
              <div className="cleanup-card-header">
                <div className="cleanup-card-title">
                  <span className="warning-badge" style={{ color: getWarningColor(cleanupFunc.warningLevel) }}>
                    {getWarningIcon(cleanupFunc.warningLevel)}
                  </span>
                  <h3>{cleanupFunc.name}</h3>
                </div>
              </div>

              <div className="cleanup-card-body">
                <p className="cleanup-description">{cleanupFunc.description}</p>

                <button
                  className="cleanup-button"
                  onClick={() => handleCleanupClick(cleanupFunc)}
                  disabled={isLoading}
                  style={{
                    background: getWarningColor(cleanupFunc.warningLevel),
                    opacity: isLoading ? 0.6 : 1,
                    cursor: isLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isLoading ? (
                    <>
                      <span className="spinner"></span>
                      Processing...
                    </>
                  ) : (
                    `Execute ${cleanupFunc.name}`
                  )}
                </button>

                {result && (
                  <div className={`result-box ${result.success ? 'success' : 'error'}`}>
                    <div className="result-header">
                      <span className="result-icon">{result.success ? '✓' : '✗'}</span>
                      <strong>{result.success ? 'Success' : 'Error'}</strong>
                      <span className="result-time">
                        {new Date(result.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    
                    {result.success ? (
                      <div className="result-details">
                        {result.data.deleted_test_transactions !== undefined && (
                          <p>Deleted test transactions: <strong>{result.data.deleted_test_transactions}</strong></p>
                        )}
                        {result.data.deleted_photos !== undefined && (
                          <p>Deleted photos: <strong>{result.data.deleted_photos}</strong></p>
                        )}
                        {result.data.deleted_questions !== undefined && (
                          <p>Deleted questions: <strong>{result.data.deleted_questions}</strong></p>
                        )}
                        {result.data.deleted_answers !== undefined && (
                          <p>Deleted answers: <strong>{result.data.deleted_answers}</strong></p>
                        )}
                        {result.data.deleted_records !== undefined && (
                          <p>Deleted records: <strong>{result.data.deleted_records}</strong></p>
                        )}
                        {result.data.checked_questions !== undefined && (
                          <p>Checked questions: <strong>{result.data.checked_questions}</strong></p>
                        )}
                        {result.data.checked_answers !== undefined && (
                          <p>Checked answers: <strong>{result.data.checked_answers}</strong></p>
                        )}
                        {result.data.checked_records !== undefined && (
                          <p>Checked records: <strong>{result.data.checked_records}</strong></p>
                        )}
                        {result.data.valid_templates !== undefined && (
                          <p>Valid templates: <strong>{result.data.valid_templates}</strong></p>
                        )}
                        {result.data.valid_questions !== undefined && (
                          <p>Valid questions: <strong>{result.data.valid_questions}</strong></p>
                        )}
                        {result.data.body && typeof result.data.body === 'string' && (
                          <p>{result.data.body}</p>
                        )}
                        {result.data.status && (
                          <p>Status: <strong>{result.data.status}</strong></p>
                        )}
                        {result.data.errors && result.data.errors.length > 0 && (
                          <div style={{ marginTop: '8px' }}>
                            <p style={{ color: '#ea580c', fontWeight: '500' }}>Warnings:</p>
                            <ul style={{ marginLeft: '20px', fontSize: '12px' }}>
                              {result.data.errors.slice(0, 5).map((error, idx) => (
                                <li key={idx}>{error}</li>
                              ))}
                              {result.data.errors.length > 5 && (
                                <li>... and {result.data.errors.length - 5} more</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="result-error">
                        <p>{result.error}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal */}
      {confirmingFunction && (
        <div className="confirmation-modal-overlay">
          <div className="confirmation-modal">
            <div className="confirmation-header">
              <span className="confirmation-icon" style={{ color: getWarningColor(confirmingFunction.warningLevel) }}>
                {getWarningIcon(confirmingFunction.warningLevel)}
              </span>
              <h2>Confirm Action</h2>
            </div>
            
            <div className="confirmation-body">
              <p className="confirmation-function-name">{confirmingFunction.name}</p>
              <p className="confirmation-message">{confirmingFunction.confirmMessage}</p>
              
              {confirmingFunction.warningLevel === 'critical' && (
                <div className="critical-warning">
                  <strong>⚠️ CRITICAL WARNING:</strong>
                  <p>This action cannot be undone and will result in permanent data loss.</p>
                </div>
              )}
            </div>

            <div className="confirmation-actions">
              <button 
                className="cancel-button" 
                onClick={handleCancel}
              >
                Cancel
              </button>
              <button 
                className="confirm-button" 
                onClick={handleConfirm}
                style={{ background: getWarningColor(confirmingFunction.warningLevel) }}
              >
                Yes, Proceed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Information Section */}
      <div className="cleanup-info-section">
        <h2>About These Functions</h2>
        <div className="info-grid">
          <div className="info-card">
            <h4>🚨 Critical Operations</h4>
            <p>These operations permanently delete data and cannot be undone. Always verify the necessity before execution.</p>
          </div>
          <div className="info-card">
            <h4>📊 Data Integrity</h4>
            <p>Regular cleanup of orphaned records helps maintain database integrity and optimal performance.</p>
          </div>
          <div className="info-card">
            <h4>💾 Backup Recommendation</h4>
            <p>Consider creating a backup before running critical cleanup operations, especially "Delete All MCQ Answers".</p>
          </div>
          <div className="info-card">
            <h4>🔍 Best Practices</h4>
            <p>Run orphaned data cleanup functions periodically to keep your database clean and prevent accumulation of invalid references.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminCleanup;
