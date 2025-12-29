// Simple in-memory cache for results page to avoid redundant API calls
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const resultCache = {
  get(key) {
    const item = cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      cache.delete(key);
      return null;
    }
    return item.data;
  },

  set(key, data, ttl = CACHE_TTL) {
    cache.set(key, {
      data,
      expiry: Date.now() + ttl
    });
  },

  invalidate(key) {
    cache.delete(key);
  },

  clear() {
    cache.clear();
  }
};

// Cache keys
export const cacheKeys = {
  testResult: (testId) => `result:${testId}`,
  testList: (email, page, sort) => `list:${email}:${page}:${sort}`,
};
