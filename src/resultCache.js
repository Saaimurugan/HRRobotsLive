// Enhanced in-memory cache for results page with better performance
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 100; // Prevent memory leaks

export const resultCache = {
  get(key) {
    const item = cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      cache.delete(key);
      return null;
    }
    
    // Update access time for LRU
    item.lastAccessed = Date.now();
    return item.data;
  },

  set(key, data, ttl = CACHE_TTL) {
    // Implement LRU eviction if cache is full
    if (cache.size >= MAX_CACHE_SIZE) {
      this._evictLRU();
    }
    
    cache.set(key, {
      data,
      expiry: Date.now() + ttl,
      lastAccessed: Date.now()
    });
  },

  invalidate(key) {
    cache.delete(key);
  },

  invalidatePattern(pattern) {
    // Invalidate all keys matching a pattern (e.g., "result:*")
    const regex = new RegExp(pattern.replace('*', '.*'));
    for (const key of cache.keys()) {
      if (regex.test(key)) {
        cache.delete(key);
      }
    }
  },

  clear() {
    cache.clear();
  },

  // Get cache statistics for debugging
  getStats() {
    const now = Date.now();
    let expired = 0;
    let active = 0;
    
    for (const [key, item] of cache.entries()) {
      if (now > item.expiry) {
        expired++;
      } else {
        active++;
      }
    }
    
    return {
      total: cache.size,
      active,
      expired,
      maxSize: MAX_CACHE_SIZE
    };
  },

  _evictLRU() {
    // Remove the least recently used item
    let oldestKey = null;
    let oldestTime = Date.now();
    
    for (const [key, item] of cache.entries()) {
      if (item.lastAccessed < oldestTime) {
        oldestTime = item.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      cache.delete(oldestKey);
    }
  }
};

// Cache keys
export const cacheKeys = {
  testResult: (testId) => `result:${testId}`,
  testList: (email, page, sort) => `list:${email}:${page}:${sort}`,
};
