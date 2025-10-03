/**
 * Chart Data Cache Service
 * Implements caching mechanism for chart data to improve performance
 */

import { Invoice, TimeSeriesPoint, CategoryStat } from '@/types';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hash: string;
}

interface ChartCacheData {
  timeSeriesDaily: CacheEntry<TimeSeriesPoint[]> | null;
  timeSeriesMonthly: CacheEntry<TimeSeriesPoint[]> | null;
  categoryBreakdown: CacheEntry<CategoryStat[]> | null;
}

class ChartCacheService {
  private cache: ChartCacheData = {
    timeSeriesDaily: null,
    timeSeriesMonthly: null,
    categoryBreakdown: null,
  };

  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Generate a hash for the invoice data to detect changes
   */
  private generateHash(invoices: Invoice[]): string {
    const sortedInvoices = [...invoices].sort((a, b) => a.id.localeCompare(b.id));
    const hashData = sortedInvoices.map(inv => `${inv.id}-${inv.totalAmount}-${inv.status}`).join('|');
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < hashData.length; i++) {
      const char = hashData.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  /**
   * Check if cache entry is valid
   */
  private isValidCache<T>(entry: CacheEntry<T> | null, currentHash: string): boolean {
    if (!entry) return false;
    
    const now = Date.now();
    const isExpired = (now - entry.timestamp) > this.CACHE_TTL;
    const isStale = entry.hash !== currentHash;
    
    return !isExpired && !isStale;
  }

  /**
   * Get cached daily time series data
   */
  getDailyTimeSeries(invoices: Invoice[]): TimeSeriesPoint[] | null {
    const hash = this.generateHash(invoices);
    
    if (this.isValidCache(this.cache.timeSeriesDaily, hash)) {
      return this.cache.timeSeriesDaily!.data;
    }
    
    return null;
  }

  /**
   * Cache daily time series data
   */
  setDailyTimeSeries(invoices: Invoice[], data: TimeSeriesPoint[]): void {
    const hash = this.generateHash(invoices);
    
    this.cache.timeSeriesDaily = {
      data: [...data], // Create a copy to prevent mutations
      timestamp: Date.now(),
      hash,
    };
  }

  /**
   * Get cached monthly time series data
   */
  getMonthlyTimeSeries(invoices: Invoice[]): TimeSeriesPoint[] | null {
    const hash = this.generateHash(invoices);
    
    if (this.isValidCache(this.cache.timeSeriesMonthly, hash)) {
      return this.cache.timeSeriesMonthly!.data;
    }
    
    return null;
  }

  /**
   * Cache monthly time series data
   */
  setMonthlyTimeSeries(invoices: Invoice[], data: TimeSeriesPoint[]): void {
    const hash = this.generateHash(invoices);
    
    this.cache.timeSeriesMonthly = {
      data: [...data], // Create a copy to prevent mutations
      timestamp: Date.now(),
      hash,
    };
  }

  /**
   * Get cached category breakdown data
   */
  getCategoryBreakdown(invoices: Invoice[]): CategoryStat[] | null {
    const hash = this.generateHash(invoices);
    
    if (this.isValidCache(this.cache.categoryBreakdown, hash)) {
      return this.cache.categoryBreakdown!.data;
    }
    
    return null;
  }

  /**
   * Cache category breakdown data
   */
  setCategoryBreakdown(invoices: Invoice[], data: CategoryStat[]): void {
    const hash = this.generateHash(invoices);
    
    this.cache.categoryBreakdown = {
      data: [...data], // Create a copy to prevent mutations
      timestamp: Date.now(),
      hash,
    };
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache = {
      timeSeriesDaily: null,
      timeSeriesMonthly: null,
      categoryBreakdown: null,
    };
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): void {
    const now = Date.now();
    
    if (this.cache.timeSeriesDaily && (now - this.cache.timeSeriesDaily.timestamp) > this.CACHE_TTL) {
      this.cache.timeSeriesDaily = null;
    }
    
    if (this.cache.timeSeriesMonthly && (now - this.cache.timeSeriesMonthly.timestamp) > this.CACHE_TTL) {
      this.cache.timeSeriesMonthly = null;
    }
    
    if (this.cache.categoryBreakdown && (now - this.cache.categoryBreakdown.timestamp) > this.CACHE_TTL) {
      this.cache.categoryBreakdown = null;
    }
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats(): {
    dailyHit: boolean;
    monthlyHit: boolean;
    categoryHit: boolean;
    cacheSize: number;
  } {
    return {
      dailyHit: this.cache.timeSeriesDaily !== null,
      monthlyHit: this.cache.timeSeriesMonthly !== null,
      categoryHit: this.cache.categoryBreakdown !== null,
      cacheSize: Object.values(this.cache).filter(entry => entry !== null).length,
    };
  }
}

// Export singleton instance
export const chartCache = new ChartCacheService();

// Export for testing
export { ChartCacheService };