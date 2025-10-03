/**
 * Memory Optimization Service
 * Handles large file processing with memory-efficient techniques
 */

import { Invoice, InvoiceItem } from '@/types';

interface ProcessingOptions {
  chunkSize?: number;
  maxMemoryUsage?: number; // in MB
  enableGarbageCollection?: boolean;
}

interface ProcessingStats {
  totalProcessed: number;
  memoryUsage: number;
  processingTime: number;
  chunksProcessed: number;
}

class MemoryOptimizer {
  private readonly DEFAULT_CHUNK_SIZE = 1000;
  // private readonly DEFAULT_MAX_MEMORY = 100; // 100MB
  private processingStats: ProcessingStats = {
    totalProcessed: 0,
    memoryUsage: 0,
    processingTime: 0,
    chunksProcessed: 0,
  };

  /**
   * Process large arrays in chunks to prevent memory overflow
   */
  async processInChunks<T, R>(
    items: T[],
    processor: (chunk: T[]) => Promise<R[]> | R[],
    options: ProcessingOptions = {}
  ): Promise<R[]> {
    const {
      chunkSize = this.DEFAULT_CHUNK_SIZE,
      enableGarbageCollection = true,
    } = options;

    const startTime = performance.now();
    const results: R[] = [];
    let processedCount = 0;

    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      
      // Process chunk
      const chunkResults = await processor(chunk);
      results.push(...chunkResults);
      
      processedCount += chunk.length;
      this.processingStats.chunksProcessed++;

      // Force garbage collection if enabled and available
      if (enableGarbageCollection && this.shouldTriggerGC()) {
        this.triggerGarbageCollection();
      }

      // Yield control to prevent blocking UI
      await this.yieldToEventLoop();

      // Check memory usage
      if (this.isMemoryUsageHigh()) {
        console.warn('High memory usage detected during processing');
      }
    }

    const endTime = performance.now();
    this.processingStats.totalProcessed = processedCount;
    this.processingStats.processingTime = endTime - startTime;

    return results;
  }

  /**
   * Optimize invoice data by removing unnecessary properties and normalizing
   */
  optimizeInvoiceData(invoices: Invoice[]): Invoice[] {
    return invoices.map(invoice => ({
      ...invoice,
      // Ensure dates are properly formatted and not keeping extra data
      invoiceDate: new Date(invoice.invoiceDate),
      // Optimize items array
      items: this.optimizeInvoiceItems(invoice.items),
    }));
  }

  /**
   * Optimize invoice items by removing duplicates and normalizing
   */
  private optimizeInvoiceItems(items: InvoiceItem[]): InvoiceItem[] {
    // Remove duplicates based on invoice number and item name
    const seen = new Set<string>();
    return items.filter(item => {
      const key = `${item.invoiceNumber}-${item.itemName}-${item.amount}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Create a memory-efficient data structure for large datasets
   */
  createMemoryEfficientStructure<T>(
    data: T[],
    keyExtractor: (item: T) => string
  ): Map<string, T> {
    const map = new Map<string, T>();
    
    // Process in chunks to avoid memory spikes
    const chunkSize = 1000;
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      
      for (const item of chunk) {
        const key = keyExtractor(item);
        map.set(key, item);
      }
      
      // Clear chunk reference
      chunk.length = 0;
    }
    
    return map;
  }

  /**
   * Batch process operations to reduce memory pressure
   */
  async batchProcess<T>(
    operations: (() => Promise<T>)[],
    batchSize: number = 10
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(op => op()));
      results.push(...batchResults);
      
      // Yield control and potentially trigger GC
      await this.yieldToEventLoop();
      if (this.shouldTriggerGC()) {
        this.triggerGarbageCollection();
      }
    }
    
    return results;
  }

  /**
   * Clean up large objects and arrays
   */
  cleanup(objects: any[]): void {
    objects.forEach(obj => {
      if (Array.isArray(obj)) {
        obj.length = 0;
      } else if (obj && typeof obj === 'object') {
        Object.keys(obj).forEach(key => {
          delete obj[key];
        });
      }
    });
  }

  /**
   * Check if memory usage is high (browser-specific)
   */
  private isMemoryUsageHigh(): boolean {
    // Use performance.memory if available (Chrome)
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedMB = memory.usedJSHeapSize / 1024 / 1024;
      const limitMB = memory.jsHeapSizeLimit / 1024 / 1024;
      
      this.processingStats.memoryUsage = usedMB;
      
      // Consider high if using more than 80% of available memory
      return (usedMB / limitMB) > 0.8;
    }
    
    return false;
  }

  /**
   * Determine if garbage collection should be triggered
   */
  private shouldTriggerGC(): boolean {
    // Trigger GC every 10 chunks or if memory is high
    return this.processingStats.chunksProcessed % 10 === 0 || this.isMemoryUsageHigh();
  }

  /**
   * Trigger garbage collection if available
   */
  private triggerGarbageCollection(): void {
    // Force garbage collection in development (if available)
    if (typeof window !== 'undefined' && 'gc' in window) {
      try {
        (window as any).gc();
      } catch (e) {
        // GC not available, ignore
      }
    }
  }

  /**
   * Yield control to the event loop to prevent blocking
   */
  private async yieldToEventLoop(): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, 0);
    });
  }

  /**
   * Get current processing statistics
   */
  getStats(): ProcessingStats {
    return { ...this.processingStats };
  }

  /**
   * Reset processing statistics
   */
  resetStats(): void {
    this.processingStats = {
      totalProcessed: 0,
      memoryUsage: 0,
      processingTime: 0,
      chunksProcessed: 0,
    };
  }

  /**
   * Estimate memory usage of an object (rough approximation)
   */
  estimateMemoryUsage(obj: any): number {
    const jsonString = JSON.stringify(obj);
    // Rough estimate: 2 bytes per character in UTF-16
    return jsonString.length * 2;
  }

  /**
   * Create a memory-efficient iterator for large datasets
   */
  *createChunkIterator<T>(data: T[], chunkSize: number = this.DEFAULT_CHUNK_SIZE): Generator<T[], void, unknown> {
    for (let i = 0; i < data.length; i += chunkSize) {
      yield data.slice(i, i + chunkSize);
    }
  }
}

// Export singleton instance
export const memoryOptimizer = new MemoryOptimizer();

// Export class for testing
export { MemoryOptimizer };