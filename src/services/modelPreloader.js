import * as faceapi from 'face-api.js';

class ModelPreloader {
  constructor() {
    this.modelsLoaded = false;
    this.loadingPromise = null;
    this.MODEL_URL = '/models';
    this.loadStartTime = null;
  }

  async loadModels() {
    // If models are already loaded, return immediately
    if (this.modelsLoaded) {
      return Promise.resolve();
    }

    // If loading is in progress, return the existing promise
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    // Start loading models with performance tracking
    this.loadStartTime = performance.now();
    this.loadingPromise = this._loadAllModels();
    
    try {
      await this.loadingPromise;
      this.modelsLoaded = true;
      const loadTime = performance.now() - this.loadStartTime;
      //console.log(`Face-api.js models loaded in ${loadTime.toFixed(2)}ms`);
    } catch (error) {
      console.error('Error loading face-api.js models:', error);
      this.loadingPromise = null; // Reset so we can try again
      throw error;
    }

    return this.loadingPromise;
  }

  // Lazy load models only when needed
  async loadModelsLazy() {
    if (this.modelsLoaded) {
      return Promise.resolve();
    }
    
    // Use requestIdleCallback for non-blocking loading
    return new Promise((resolve, reject) => {
      const loadWhenIdle = () => {
        this.loadModels().then(resolve).catch(reject);
      };

      if (window.requestIdleCallback) {
        window.requestIdleCallback(loadWhenIdle, { timeout: 5000 });
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(loadWhenIdle, 100);
      }
    });
  }

  async _loadAllModels() {
    try {
      // Load models in parallel with timeout for better error handling
      const loadPromises = [
        faceapi.nets.ssdMobilenetv1.loadFromUri(this.MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(this.MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(this.MODEL_URL)
      ];

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Model loading timeout')), 30000);
      });

      await Promise.race([
        Promise.all(loadPromises),
        timeoutPromise
      ]);

      //console.log('All face-api.js models loaded successfully');
    } catch (error) {
      console.error('Failed to load face-api.js models:', error);
      throw error;
    }
  }

  isLoaded() {
    return this.modelsLoaded;
  }

  getLoadingStatus() {
    if (this.modelsLoaded) return 'loaded';
    if (this.loadingPromise) return 'loading';
    return 'not-started';
  }
}

// Create a singleton instance
const modelPreloader = new ModelPreloader();

export default modelPreloader;