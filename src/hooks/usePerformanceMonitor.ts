/**
 * Performance Monitoring Hook
 * Monitors component render performance and memory usage
 */

import { useEffect, useRef, useState, useCallback } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage?: number;
  renderCount: number;
  lastRenderTime: number;
}

interface PerformanceOptions {
  enableMemoryMonitoring?: boolean;
  logToConsole?: boolean;
  componentName?: string;
}

export function usePerformanceMonitor(options: PerformanceOptions = {}) {
  const {
    enableMemoryMonitoring = false,
    logToConsole = false,
    componentName = 'Component',
  } = options;

  const renderStartTime = useRef<number>(0);
  const renderCount = useRef<number>(0);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    renderCount: 0,
    lastRenderTime: 0,
  });

  // Start performance measurement
  const startMeasurement = useCallback(() => {
    renderStartTime.current = performance.now();
  }, []);

  // End performance measurement
  const endMeasurement = useCallback(() => {
    const endTime = performance.now();
    const renderTime = endTime - renderStartTime.current;
    renderCount.current += 1;

    let memoryUsage: number | undefined;
    
    // Get memory usage if available and enabled
    if (enableMemoryMonitoring && 'memory' in performance) {
      const memory = (performance as any).memory;
      memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // Convert to MB
    }

    const newMetrics: PerformanceMetrics = {
      renderTime,
      memoryUsage,
      renderCount: renderCount.current,
      lastRenderTime: endTime,
    };

    setMetrics(newMetrics);

    // Log to console if enabled
    if (logToConsole) {
      console.log(`[Performance] ${componentName}:`, {
        renderTime: `${renderTime.toFixed(2)}ms`,
        renderCount: renderCount.current,
        memoryUsage: memoryUsage ? `${memoryUsage.toFixed(2)}MB` : 'N/A',
      });
    }

    // Warn about slow renders
    if (renderTime > 16) { // 16ms = 60fps threshold
      console.warn(`[Performance Warning] ${componentName} took ${renderTime.toFixed(2)}ms to render (>16ms)`);
    }
  }, [enableMemoryMonitoring, logToConsole, componentName]);

  // Measure render performance
  useEffect(() => {
    endMeasurement();
  });

  // Start measurement on component mount/update
  startMeasurement();

  return {
    metrics,
    startMeasurement,
    endMeasurement,
  };
}

/**
 * Hook for measuring specific operations
 */
export function useOperationTimer() {
  const [timings, setTimings] = useState<Record<string, number>>({});

  const timeOperation = useCallback(async <T>(
    operationName: string,
    operation: () => Promise<T> | T
  ): Promise<T> => {
    const startTime = performance.now();
    
    try {
      const result = await operation();
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      setTimings(prev => ({
        ...prev,
        [operationName]: duration,
      }));
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      setTimings(prev => ({
        ...prev,
        [`${operationName}_error`]: duration,
      }));
      
      throw error;
    }
  }, []);

  const getAverageTime = useCallback((operationName: string): number => {
    const matchingKeys = Object.keys(timings).filter(key => 
      key.startsWith(operationName) && !key.endsWith('_error')
    );
    
    if (matchingKeys.length === 0) return 0;
    
    const total = matchingKeys.reduce((sum, key) => sum + timings[key], 0);
    return total / matchingKeys.length;
  }, [timings]);

  return {
    timings,
    timeOperation,
    getAverageTime,
  };
}

/**
 * Hook for monitoring component re-renders
 */
export function useRenderTracker(componentName: string, props?: any) {
  const renderCount = useRef(0);
  const prevProps = useRef(props);
  const [renderInfo, setRenderInfo] = useState({
    count: 0,
    changedProps: [] as string[],
  });

  useEffect(() => {
    renderCount.current += 1;
    
    let changedProps: string[] = [];
    
    // Track prop changes
    if (props && prevProps.current) {
      changedProps = Object.keys(props).filter(key => 
        props[key] !== prevProps.current[key]
      );
    }
    
    setRenderInfo({
      count: renderCount.current,
      changedProps,
    });
    
    prevProps.current = props;
    
    // Log excessive re-renders
    if (renderCount.current > 10) {
      console.warn(`[Render Warning] ${componentName} has rendered ${renderCount.current} times`, {
        changedProps,
      });
    }
  });

  return renderInfo;
}

/**
 * Hook for debouncing expensive operations
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook for throttling function calls
 */
export function useThrottle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T {
  const lastCall = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastCall.current >= delay) {
      lastCall.current = now;
      return func(...args);
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        lastCall.current = Date.now();
        func(...args);
      }, delay - (now - lastCall.current));
    }
  }, [func, delay]) as T;
}