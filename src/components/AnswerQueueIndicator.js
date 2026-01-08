import React, { useState, useEffect } from 'react';
import answerQueue from '../services/answerQueue';

const AnswerQueueIndicator = ({ testID, show = false }) => {
  const [stats, setStats] = useState({ queuedAnswers: 0, savedAnswers: 0, isSaving: false });

  useEffect(() => {
    if (!show || !testID) return;

    const updateStats = () => {
      const currentStats = answerQueue.getStats(testID);
      setStats(currentStats);
    };

    // Update stats immediately
    updateStats();

    // Update stats periodically
    const interval = setInterval(updateStats, 1000);

    return () => clearInterval(interval);
  }, [testID, show]);

  if (!show) return null;

  const { queuedAnswers, savedAnswers, isSaving } = stats;
  const totalAnswers = queuedAnswers + savedAnswers;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '20px',
      background: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '8px 12px',
      borderRadius: '6px',
      fontSize: '12px',
      fontFamily: 'monospace',
      zIndex: 1000,
      minWidth: '180px'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
        Answer Queue Status
      </div>
      <div>Saved: {savedAnswers}</div>
      <div>Queued: {queuedAnswers}</div>
      <div>Total: {totalAnswers}</div>
      <div style={{ 
        color: isSaving ? '#FF9800' : (queuedAnswers > 0 ? '#FFC107' : '#4CAF50'),
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginTop: '4px'
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: isSaving ? '#FF9800' : (queuedAnswers > 0 ? '#FFC107' : '#4CAF50')
        }} />
        {isSaving ? 'Saving...' : (queuedAnswers > 0 ? 'Pending' : 'Synced')}
      </div>
      {queuedAnswers > 0 && (
        <div style={{ 
          fontSize: '10px', 
          color: '#FFC107',
          marginTop: '2px'
        }}>
          {queuedAnswers} answer{queuedAnswers !== 1 ? 's' : ''} pending sync
        </div>
      )}
    </div>
  );
};

export default AnswerQueueIndicator;