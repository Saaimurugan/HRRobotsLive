import React, { useState, useEffect } from 'react';
import ModelLoadingIndicator from './ModelLoadingIndicator';
import modelPreloader from '../services/modelPreloader';

const FaceDetectionPreloader = ({ children, showLoadingIndicator = true }) => {
  const [modelsReady, setModelsReady] = useState(false);
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    const ensureModelsLoaded = async () => {
      if (modelPreloader.isLoaded()) {
        setModelsReady(true);
        return;
      }

      if (showLoadingIndicator) {
        setShowLoading(true);
      }

      try {
        await modelPreloader.loadModels();
        setModelsReady(true);
      } catch (error) {
        console.error('Failed to load face detection models:', error);
        // Still render children even if models fail to load
        setModelsReady(true);
      } finally {
        setShowLoading(false);
      }
    };

    ensureModelsLoaded();
  }, [showLoadingIndicator]);

  const handleLoadComplete = (success) => {
    setModelsReady(true);
    setShowLoading(false);
  };

  return (
    <>
      {showLoading && <ModelLoadingIndicator onLoadComplete={handleLoadComplete} />}
      {modelsReady ? children : null}
    </>
  );
};

export default FaceDetectionPreloader;