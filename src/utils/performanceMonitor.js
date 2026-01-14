// Performance monitoring utility for tracking app performance
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.enabled = process.env.NODE_ENV === 'development';
  }

  // Start timing an operation
  startTiming(label) {
    if (!this.enabled) return;
    
    this.metrics.set(label, {
      startTime: performance.now(),
      endTime: null,
      duration: null
    });
  }

  // End timing an operation
  endTiming(label) {
    if (!this.enabled) return;
    
    const metric = this.metrics.get(label);
    if (metric) {
      metric.endTime = performance.now();
      metric.duration = metric.endTime - metric.startTime;
      
      //console.log(`⏱️ ${label}: ${metric.duration.toFixed(2)}ms`);
      return metric.duration;
    }
  }

  // Measure a function execution time
  async measureAsync(label, asyncFn) {
    if (!this.enabled) return await asyncFn();
    
    this.startTiming(label);
    try {
      const result = await asyncFn();
      this.endTiming(label);
      return result;
    } catch (error) {
      this.endTiming(label);
      throw error;
    }
  }

  // Measure sync function execution time
  measure(label, fn) {
    if (!this.enabled) return fn();
    
    this.startTiming(label);
    try {
      const result = fn();
      this.endTiming(label);
      return result;
    } catch (error) {
      this.endTiming(label);
      throw error;
    }
  }

  // Get all metrics
  getMetrics() {
    const results = {};
    for (const [label, metric] of this.metrics.entries()) {
      if (metric.duration !== null) {
        results[label] = metric.duration;
      }
    }
    return results;
  }

  // Monitor Core Web Vitals
  monitorWebVitals() {
    if (!this.enabled || typeof window === 'undefined') return;

    // Largest Contentful Paint
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        //console.log('🎯 LCP:', entry.startTime.toFixed(2) + 'ms');
      }
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        //console.log('⚡ FID:', entry.processingStart - entry.startTime + 'ms');
      }
    }).observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift
    new PerformanceObserver((list) => {
      let clsValue = 0;
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
      //console.log('📐 CLS:', clsValue.toFixed(4));
    }).observe({ entryTypes: ['layout-shift'] });
  }

  // Monitor bundle sizes
  logBundleInfo() {
    if (!this.enabled || typeof window === 'undefined') return;

    // Log navigation timing
    const navigation = performance.getEntriesByType('navigation')[0];
    if (navigation) {
      //console.log('📦 Bundle Performance:');
      //console.log(`  DNS Lookup: ${(navigation.domainLookupEnd - navigation.domainLookupStart).toFixed(2)}ms`);
      //console.log(`  TCP Connect: ${(navigation.connectEnd - navigation.connectStart).toFixed(2)}ms`);
      //console.log(`  Request: ${(navigation.responseStart - navigation.requestStart).toFixed(2)}ms`);
      //console.log(`  Response: ${(navigation.responseEnd - navigation.responseStart).toFixed(2)}ms`);
      //console.log(`  DOM Processing: ${(navigation.domContentLoadedEventEnd - navigation.responseEnd).toFixed(2)}ms`);
      //console.log(`  Total Load Time: ${(navigation.loadEventEnd - navigation.navigationStart).toFixed(2)}ms`);
    }
  }

  // Clear all metrics
  clear() {
    this.metrics.clear();
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

export default performanceMonitor;

// Convenience functions
export const startTiming = (label) => performanceMonitor.startTiming(label);
export const endTiming = (label) => performanceMonitor.endTiming(label);
export const measureAsync = (label, fn) => performanceMonitor.measureAsync(label, fn);
export const measure = (label, fn) => performanceMonitor.measure(label, fn);