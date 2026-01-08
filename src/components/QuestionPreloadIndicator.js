import React, { useState, useEffect } from 'react';
import questionPreloader from '../services/questionPreloader';

const QuestionPreloadIndicator = ({ testID, candidateName, show = false }) => {
  const [stats, setStats] = useState({ preloadedCount: 0, preloadingCount: 0 });
  const [isPreloading, setIsPreloading] = useState(false);

  useEffect(() => {
    if (!show || !testID || !candidateName) return;

    const updateStats = () => {
      const currentStats = questionPreloader.getStats();
      const preloadingStatus = questionPreloader.isPreloadingQuestion(testID, candidateName);
      
      setStats(currentStats);
      setIsPreloading(preloadingStatus);
    };

    // Update stats immediately
    updateStats();

    // Update stats periodically
    const interval = setInterval(updateStats, 1000);

    return () => clearInterval(interval);
  }, [testID, candidateName, show]);

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '8px 12px',
      borderRadius: '6px',
      fontSize: '12px',
      fontFamily: 'monospace',
      zIndex: 1000,
      minWidth: '200px'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
        Question Preloader Status
      </div>
      <div>Preloaded: {stats.preloadedCount}</div>
      <div>Preloading: {stats.preloadingCount}</div>
      <div style={{ 
        color: isPreloading ? '#4CAF50' : '#999',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: isPreloading ? '#4CAF50' : '#999'
        }} />
        {isPreloading ? 'Preloading...' : 'Idle'}
      </div>
    </div>
  );
};

export default QuestionPreloadIndicator;