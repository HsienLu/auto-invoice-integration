import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createExportProgress,
  updateExportProgress,
  completeExport,
  failExport,
  retryExport,
  getExportDuration,
  formatExportStatusMessage,
  getUserFriendlyErrorMessage,
  validateExportEnvironment,
  useExportProgressStore
} from '../exportProgressService';

// Mock performance.memory for testing
Object.defineProperty(global, 'performance', {
  value: {
    memory: {
      jsHeapSizeLimit: 1073741824, // 1GB
      usedJSHeapSize: 536870912,   // 512MB
    }
  }
});

describe('exportProgressService', () => {
  beforeEach(() => {
    // Clear the store before each test
    useExportProgressStore.setState({ exports: {} });
  });

  describe('createExportProgress', () => {
    it('should create a new export progress entry', () => {
      const id = createExportProgress('csv', 'Test export');
      
      expect(id).toBeTruthy();
      expect(id).toMatch(/^export_\d+_[a-z0-9]+$/);
      
      const state = useExportProgressStore.getState();
      const exportItem = state.exports[id];
      
      expect(exportItem).toBeDefined();
      expect(exportItem.type).toBe('csv');
      expect(exportItem.message).toBe('Test export');
      expect(exportItem.status).toBe('preparing');
      expect(exportItem.progress).toBe(0);
      expect(exportItem.retryCount).toBe(0);
      expect(exportItem.maxRetries).toBe(3);
    });

    it('should create export with custom max retries', () => {
      const id = createExportProgress('pdf', 'Test PDF export', 5);
      
      const state = useExportProgressStore.getState();
      const exportItem = state.exports[id];
      
      expect(exportItem.maxRetries).toBe(5);
    });
  });

  describe('updateExportProgress', () => {
    it('should update export progress', () => {
      const id = createExportProgress('csv', 'Test export');
      
      updateExportProgress(id, 'processing', 50, 'Processing data...');
      
      const state = useExportProgressStore.getState();
      const exportItem = state.exports[id];
      
      expect(exportItem.status).toBe('processing');
      expect(exportItem.progress).toBe(50);
      expect(exportItem.message).toBe('Processing data...');
    });

    it('should clamp progress values', () => {
      const id = createExportProgress('csv', 'Test export');
      
      updateExportProgress(id, 'processing', 150);
      let state = useExportProgressStore.getState();
      expect(state.exports[id].progress).toBe(100);
      
      updateExportProgress(id, 'processing', -10);
      state = useExportProgressStore.getState();
      expect(state.exports[id].progress).toBe(0);
    });

    it('should set end time for completed or error status', () => {
      const id = createExportProgress('csv', 'Test export');
      
      updateExportProgress(id, 'completed', 100);
      
      const state = useExportProgressStore.getState();
      const exportItem = state.exports[id];
      
      expect(exportItem.endTime).toBeDefined();
      expect(exportItem.endTime).toBeInstanceOf(Date);
    });
  });

  describe('completeExport', () => {
    it('should mark export as completed', () => {
      const id = createExportProgress('csv', 'Test export');
      
      completeExport(id, 'Export completed successfully');
      
      const state = useExportProgressStore.getState();
      const exportItem = state.exports[id];
      
      expect(exportItem.status).toBe('completed');
      expect(exportItem.progress).toBe(100);
      expect(exportItem.message).toBe('Export completed successfully');
      expect(exportItem.endTime).toBeDefined();
    });
  });

  describe('failExport', () => {
    it('should mark export as failed', () => {
      const id = createExportProgress('csv', 'Test export');
      
      failExport(id, 'Export failed due to network error');
      
      const state = useExportProgressStore.getState();
      const exportItem = state.exports[id];
      
      expect(exportItem.status).toBe('error');
      expect(exportItem.progress).toBe(0);
      expect(exportItem.message).toBe('匯出失敗');
      expect(exportItem.error).toBe('Export failed due to network error');
      expect(exportItem.endTime).toBeDefined();
    });
  });

  describe('retryExport', () => {
    it('should retry export if under max retries', () => {
      const id = createExportProgress('csv', 'Test export', 2);
      
      // Fail the export first
      failExport(id, 'Network error');
      
      const success = retryExport(id);
      
      expect(success).toBe(true);
      
      const state = useExportProgressStore.getState();
      const exportItem = state.exports[id];
      
      expect(exportItem.status).toBe('preparing');
      expect(exportItem.progress).toBe(0);
      expect(exportItem.retryCount).toBe(1);
      expect(exportItem.error).toBeUndefined();
      expect(exportItem.endTime).toBeUndefined();
    });

    it('should not retry if max retries exceeded', () => {
      const id = createExportProgress('csv', 'Test export', 1);
      
      // Fail and retry once
      failExport(id, 'Network error');
      retryExport(id);
      
      // Fail again
      failExport(id, 'Network error again');
      
      const success = retryExport(id);
      
      expect(success).toBe(false);
      
      const state = useExportProgressStore.getState();
      const exportItem = state.exports[id];
      
      expect(exportItem.status).toBe('error');
      expect(exportItem.retryCount).toBe(1);
    });

    it('should return false for non-existent export', () => {
      const success = retryExport('non-existent-id');
      expect(success).toBe(false);
    });
  });

  describe('getExportDuration', () => {
    it('should calculate duration for completed export', () => {
      const startTime = new Date('2024-01-01T10:00:00Z');
      const endTime = new Date('2024-01-01T10:00:05Z');
      
      const exportItem = {
        id: 'test',
        type: 'csv' as const,
        status: 'completed' as const,
        progress: 100,
        message: 'Test',
        startTime,
        endTime,
        retryCount: 0,
        maxRetries: 3
      };
      
      const duration = getExportDuration(exportItem);
      expect(duration).toBe(5);
    });

    it('should calculate duration for ongoing export', () => {
      const startTime = new Date(Date.now() - 3000); // 3 seconds ago
      
      const exportItem = {
        id: 'test',
        type: 'csv' as const,
        status: 'processing' as const,
        progress: 50,
        message: 'Test',
        startTime,
        retryCount: 0,
        maxRetries: 3
      };
      
      const duration = getExportDuration(exportItem);
      expect(duration).toBeCloseTo(3, 0);
    });
  });

  describe('formatExportStatusMessage', () => {
    it('should format status messages correctly', () => {
      const baseExport = {
        id: 'test',
        type: 'csv' as const,
        message: 'Test export',
        startTime: new Date(Date.now() - 5000),
        endTime: new Date(),
        retryCount: 0,
        maxRetries: 3
      };

      expect(formatExportStatusMessage({
        ...baseExport,
        status: 'preparing',
        progress: 0
      })).toBe('準備匯出...');

      expect(formatExportStatusMessage({
        ...baseExport,
        status: 'processing',
        progress: 50
      })).toBe('處理中... (50%)');

      expect(formatExportStatusMessage({
        ...baseExport,
        status: 'generating',
        progress: 80
      })).toBe('生成檔案中... (80%)');

      expect(formatExportStatusMessage({
        ...baseExport,
        status: 'completed',
        progress: 100
      })).toBe('匯出完成 (耗時 5 秒)');

      expect(formatExportStatusMessage({
        ...baseExport,
        status: 'error',
        progress: 0,
        error: 'Network error'
      })).toBe('匯出失敗 (Network error)');
    });
  });

  describe('getUserFriendlyErrorMessage', () => {
    it('should provide memory error suggestions', () => {
      const result = getUserFriendlyErrorMessage('Out of memory error');
      
      expect(result.message).toContain('記憶體不足');
      expect(result.suggestions).toContain('嘗試減少匯出的資料量');
    });

    it('should provide network error suggestions', () => {
      const result = getUserFriendlyErrorMessage('Network fetch failed');
      
      expect(result.message).toContain('網路連線問題');
      expect(result.suggestions).toContain('檢查網路連線');
    });

    it('should provide permission error suggestions', () => {
      const result = getUserFriendlyErrorMessage('Access denied');
      
      expect(result.message).toContain('檔案存取權限不足');
      expect(result.suggestions).toContain('檢查瀏覽器下載設定');
    });

    it('should provide canvas error suggestions', () => {
      const result = getUserFriendlyErrorMessage('Canvas rendering failed');
      
      expect(result.message).toContain('圖表擷取失敗');
      expect(result.suggestions).toContain('確保圖表已完全載入');
    });

    it('should provide parse error suggestions', () => {
      const result = getUserFriendlyErrorMessage('Parse error in data');
      
      expect(result.message).toContain('資料格式錯誤');
      expect(result.suggestions).toContain('檢查資料完整性');
    });

    it('should provide default error suggestions', () => {
      const result = getUserFriendlyErrorMessage('Unknown error');
      
      expect(result.message).toContain('匯出過程中發生錯誤');
      expect(result.suggestions).toContain('稍後再試');
    });
  });

  describe('validateExportEnvironment', () => {
    it('should validate browser support', () => {
      // Ensure URL is available in test environment with proper methods
      global.URL = {
        createObjectURL: vi.fn(),
        revokeObjectURL: vi.fn()
      } as any;
      
      const result = validateExportEnvironment();
      
      expect(result.errors).toHaveLength(0);
      expect(result.isValid).toBe(true);
    });

    it('should detect memory warnings', () => {
      // Mock low memory scenario
      Object.defineProperty(global, 'performance', {
        value: {
          memory: {
            jsHeapSizeLimit: 100 * 1024 * 1024, // 100MB
            usedJSHeapSize: 80 * 1024 * 1024,   // 80MB (only 20MB available)
          }
        }
      });

      const result = validateExportEnvironment();
      
      expect(result.warnings.some(w => w.includes('記憶體較少'))).toBe(true);
    });

    it('should handle missing Blob support', () => {
      const originalBlob = global.Blob;
      // @ts-ignore
      delete global.Blob;

      const result = validateExportEnvironment();
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('檔案下載功能'))).toBe(true);

      // Restore
      global.Blob = originalBlob;
    });

    it('should handle localStorage issues', () => {
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = vi.fn(() => {
        throw new Error('Storage quota exceeded');
      });

      const result = validateExportEnvironment();
      
      expect(result.warnings.some(w => w.includes('本地儲存不可用'))).toBe(true);

      // Restore
      Storage.prototype.setItem = originalSetItem;
    });
  });
});