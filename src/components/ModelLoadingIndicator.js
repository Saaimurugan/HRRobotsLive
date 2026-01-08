import React, { useState, useEffect } from 'react';
import modelPreloader from '../services/modelPreloader';

const ModelLoadingIndicator = ({ onLoadComplete }) => {
  const [loadingStatus, setLoadingStatus] = useState('checking');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const checkModelStatus = async () => {
      const status = modelPreloader.getLoadingStatus();
      
      if (status === 'loaded') {
        setLoadingStatus('loaded');
        setProgress(100);
        if (onLoadComplete) {
          onLoadComplete(true);
        }
        return;
      }

      if (status === 'loading') {
        setLoadingStatus('loading');
        // Simulate progress for better UX
        let currentProgress = 0;
        const progressInterval = setInterval(() => {
          currentProgress += 10;
          setProgress(Math.min(currentProgress, 90)); // Don't go to 100% until actually loaded
          
          if (modelPreloader.isLoaded()) {
            clearInterval(progressInterval);
            setProgress(100);
            setLoadingStatus('loaded');
            if (onLoadComplete) {
              onLoadComplete(true);
            }
          }
        }, 200);

        // Wait for models to load
        try {
          await modelPreloader.loadModels();
          clearInterval(progressInterval);
          setProgress(100);
          setLoadingStatus('loaded');
          if (onLoadComplete) {
            onLoadComplete(true);
          }
        } catch (error) {
          clearInterval(progressInterval);
          setLoadingStatus('error');
          if (onLoadComplete) {
            onLoadComplete(false);
          }
        }
      } else {
        // Not started, start loading
        setLoadingStatus('loading');
        try {
          await modelPreloader.loadModels();
          setProgress(100);
          setLoadingStatus('loaded');
          if (onLoadComplete) {
            onLoadComplete(true);
          }
        } catch (error) {
          setLoadingStatus('error');
          if (onLoadComplete) {
            onLoadComplete(false);
          }
        }
      }
    };

    checkModelStatus();
  }, [onLoadComplete]);

  if (loadingStatus === 'loaded') {
    return null; // Don't show anything when loaded
  }

  if (loadingStatus === 'error') {
    return (
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'rgba(255, 255, 255, 0.95)',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        textAlign: 'center',
        zIndex: 9999
      }}>
        <div style={{ color: '#e74c3c', fontSize: '18px', marginBottom: '10px' }}>
          ⚠️ Model Loading Failed
        </div>
        <div style={{ color: '#666', fontSize: '14px' }}>
          Face detection models could not be loaded. Please refresh the page.
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'rgba(255, 255, 255, 0.95)',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      textAlign: 'center',
      zIndex: 9999,
      minWidth: '250px'
    }}>
      <div style={{ color: '#1CBBB4', fontSize: '18px', marginBottom: '15px' }}>
        🤖 Loading AI Models
      </div>
      <div style={{ 
        width: '100%', 
        height: '6px', 
        background: '#f0f0f0', 
        borderRadius: '3px',
        overflow: 'hidden',
        marginBottom: '10px'
      }}>
        <div style={{
          width: `${progress}%`,
          height: '100%',
          background: 'linear-gradient(90deg, #1CBBB4, #17a2b8)',
          borderRadius: '3px',
          transition: 'width 0.3s ease'
        }} />
      </div>
      <div style={{ color: '#666', fontSize: '14px' }}>
        Preparing face detection... {Math.round(progress)}%
      </div>
      <div style={{ color: '#999', fontSize: '12px', marginTop: '5px' }}>
        This improves performance during tests
      </div>
    </div>
  );
};

export default ModelLoadingIndicator;