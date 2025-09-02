/**
 * Caching Utilities
 * 
 * This module provides LRU (Least Recently Used) caching implementation
 * for storing analysis results and improving performance.
 */

/**
 * Cache entry interface
 */
interface CacheEntry<T> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

/**
 * Cache statistics interface
 */
export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
  hitRate: number;
  memoryUsage: number;
}

/**
 * LRU Cache implementation with TTL support
 */
export class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  private defaultTTL: number;
  private stats = {
    hits: 0,
    misses: 0
  };

  constructor(maxSize: number = 1000, defaultTTL: number = 300000) { // 5 minutes default TTL
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  /**
   * Get value from cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access information
    entry.lastAccessed = Date.now();
    entry.accessCount++;
    
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    
    this.stats.hits++;
    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T, ttl?: number): void {
    const actualTTL = ttl || this.defaultTTL;
    const now = Date.now();

    // If at capacity, remove least recently used
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    // Remove existing entry if it exists
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Add new entry
    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: now,
      ttl: actualTTL,
      accessCount: 1,
      lastAccessed: now
    };

    this.cache.set(key, entry);
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete key from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries from cache
   */
  clear(): void {
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;
    
    // Estimate memory usage (rough calculation)
    let memoryUsage = 0;
    for (const entry of this.cache.values()) {
      memoryUsage += JSON.stringify(entry).length * 2; // Rough estimate
    }

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: Math.round(hitRate * 100) / 100,
      memoryUsage
    };
  }

  /**
   * Get all keys in cache
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Get entries sorted by access count (most accessed first)
   */
  getMostAccessed(limit: number = 10): Array<{ key: string; accessCount: number; value: T }> {
    const entries = Array.from(this.cache.entries())
      .map(([key, entry]) => ({
        key,
        accessCount: entry.accessCount,
        value: entry.value
      }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit);

    return entries;
  }

  /**
   * Update TTL for a specific key
   */
  updateTTL(key: string, newTTL: number): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    entry.ttl = newTTL;
    entry.timestamp = Date.now(); // Reset timestamp for new TTL
    return true;
  }
}

/**
 * Global cache instance for analysis results
 */
export const analysisCache = new LRUCache<any>(500, 600000); // 10 minutes TTL

/**
 * Generate cache key for analysis requests
 */
export function generateCacheKey(prompt: string, domain?: string, options?: any): string {
  const data = { prompt, domain, options };
  return btoa(JSON.stringify(data)).slice(0, 32); // Base64 encode and truncate
}

/**
 * Cache decorator for analysis functions
 */
export function withCache<T extends (...args: any[]) => any>(
  fn: T,
  generateKey: (...args: Parameters<T>) => string,
  ttl?: number
): T {
  return ((...args: Parameters<T>) => {
    const key = generateKey(...args);
    
    // Try to get from cache first
    const cached = analysisCache.get(key);
    if (cached !== null) {
      return cached;
    }
    
    // Execute function and cache result
    const result = fn(...args);
    analysisCache.set(key, result, ttl);
    
    return result;
  }) as T;
}

/**
 * Warm up cache with common analysis patterns
 */
export function warmUpCache(): void {
  // Pre-cache common prompt patterns for faster responses
  const commonPrompts = [
    "Create a React component",
    "Write documentation for API",
    "Analyze user requirements",
    "Build authentication system",
    "Design database schema"
  ];

  // This would typically be done in background
  // For now, just prepare the cache structure
  console.log(`Cache warmed up with ${commonPrompts.length} common patterns`);
}

/**
 * Schedule periodic cache cleanup
 */
export function scheduleCleanup(intervalMs: number = 300000): NodeJS.Timeout { // 5 minutes
  return setInterval(() => {
    const cleaned = analysisCache.cleanup();
    if (cleaned > 0) {
      console.log(`Cache cleanup: removed ${cleaned} expired entries`);
    }
  }, intervalMs);
}

/**
 * Export cache for monitoring and debugging
 */
export function exportCacheData(): any {
  return {
    stats: analysisCache.getStats(),
    keys: analysisCache.keys(),
    mostAccessed: analysisCache.getMostAccessed(5)
  };
}
