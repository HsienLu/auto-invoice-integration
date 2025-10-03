import { create } from 'zustand';

export interface ExportProgress {
  id: string;
  type: 'csv' | 'pdf';
  status: 'preparing' | 'processing' | 'generating' | 'completed' | 'error';
  progress: number; // 0-100
  message: string;
  startTime: Date;
  endTime?: Date;
  error?: string;
  retryCount: number;
  maxRetries: number;
}

interface ExportProgressStore {
  exports: Record<string, ExportProgress>;
  addExport: (exportData: Omit<ExportProgress, 'id' | 'startTime' | 'retryCount'>) => string;
  updateExport: (id: string, updates: Partial<ExportProgress>) => void;
  removeExport: (id: string) => void;
  retryExport: (id: string) => void;
  clearCompleted: () => void;
  getActiveExports: () => ExportProgress[];
}

export const useExportProgressStore = create<ExportProgressStore>((set, get) => ({
  exports: {},

  addExport: (exportData) => {
    const id = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newExport: ExportProgress = {
      ...exportData,
      id,
      startTime: new Date(),
      retryCount: 0
    };

    set((state) => ({
      exports: {
        ...state.exports,
        [id]: newExport
      }
    }));

    return id;
  },

  updateExport: (id, updates) => {
    set((state) => ({
      exports: {
        ...state.exports,
        [id]: {
          ...state.exports[id],
          ...updates,
          ...(updates.status === 'completed' || updates.status === 'error' 
            ? { endTime: new Date() } 
            : {})
        }
      }
    }));
  },

  removeExport: (id) => {
    set((state) => {
      const { [id]: removed, ...rest } = state.exports;
      return { exports: rest };
    });
  },

  retryExport: (id) => {
    const exportItem = get().exports[id];
    if (exportItem && exportItem.retryCount < exportItem.maxRetries) {
      set((state) => ({
        exports: {
          ...state.exports,
          [id]: {
            ...exportItem,
            status: 'preparing',
            progress: 0,
            retryCount: exportItem.retryCount + 1,
            error: undefined,
            endTime: undefined
          }
        }
      }));
    }
  },

  clearCompleted: () => {
    set((state) => {
      const activeExports = Object.fromEntries(
        Object.entries(state.exports).filter(
          ([_, exportItem]) => exportItem.status !== 'completed' && exportItem.status !== 'error'
        )
      );
      return { exports: activeExports };
    });
  },

  getActiveExports: () => {
    const state = get();
    return Object.values(state.exports).filter(
      (exportItem) => exportItem.status !== 'completed' && exportItem.status !== 'error'
    );
  }
}));

/**
 * Create a new export progress tracker
 */
export function createExportProgress(
  type: 'csv' | 'pdf',
  message: string,
  maxRetries: number = 3
): string {
  return useExportProgressStore.getState().addExport({
    type,
    status: 'preparing',
    progress: 0,
    message,
    maxRetries
  });
}

/**
 * Update export progress
 */
export function updateExportProgress(
  id: string,
  status: ExportProgress['status'],
  progress: number,
  message?: string,
  error?: string
): void {
  const updates: Partial<ExportProgress> = {
    status,
    progress: Math.min(100, Math.max(0, progress))
  };

  if (message) updates.message = message;
  if (error) updates.error = error;

  useExportProgressStore.getState().updateExport(id, updates);
}

/**
 * Mark export as completed
 */
export function completeExport(id: string, message: string): void {
  updateExportProgress(id, 'completed', 100, message);
}

/**
 * Mark export as failed
 */
export function failExport(id: string, error: string): void {
  updateExportProgress(id, 'error', 0, '匯出失敗', error);
}

/**
 * Retry a failed export
 */
export function retryExport(id: string): boolean {
  const exportItem = useExportProgressStore.getState().exports[id];
  if (!exportItem) return false;

  if (exportItem.retryCount >= exportItem.maxRetries) {
    return false;
  }

  useExportProgressStore.getState().retryExport(id);
  return true;
}

/**
 * Get export duration in seconds
 */
export function getExportDuration(exportItem: ExportProgress): number {
  const endTime = exportItem.endTime || new Date();
  return Math.round((endTime.getTime() - exportItem.startTime.getTime()) / 1000);
}

/**
 * Format export status message
 */
export function formatExportStatusMessage(exportItem: ExportProgress): string {
  const duration = getExportDuration(exportItem);
  
  switch (exportItem.status) {
    case 'preparing':
      return '準備匯出...';
    case 'processing':
      return `處理中... (${exportItem.progress}%)`;
    case 'generating':
      return `生成檔案中... (${exportItem.progress}%)`;
    case 'completed':
      return `匯出完成 (耗時 ${duration} 秒)`;
    case 'error':
      return `匯出失敗 (${exportItem.error || '未知錯誤'})`;
    default:
      return exportItem.message;
  }
}

/**
 * Get user-friendly error messages
 */
export function getUserFriendlyErrorMessage(error: string): {
  message: string;
  suggestions: string[];
} {
  const errorLower = error.toLowerCase();
  
  if (errorLower.includes('memory') || errorLower.includes('out of memory')) {
    return {
      message: '記憶體不足，無法處理大量資料',
      suggestions: [
        '嘗試減少匯出的資料量',
        '關閉其他應用程式釋放記憶體',
        '分批匯出資料'
      ]
    };
  }
  
  if (errorLower.includes('network') || errorLower.includes('fetch')) {
    return {
      message: '網路連線問題',
      suggestions: [
        '檢查網路連線',
        '稍後再試',
        '重新整理頁面'
      ]
    };
  }
  
  if (errorLower.includes('permission') || errorLower.includes('access')) {
    return {
      message: '檔案存取權限不足',
      suggestions: [
        '檢查瀏覽器下載設定',
        '確認有足夠的磁碟空間',
        '嘗試使用不同的檔案名稱'
      ]
    };
  }
  
  if (errorLower.includes('canvas') || errorLower.includes('chart')) {
    return {
      message: '圖表擷取失敗',
      suggestions: [
        '確保圖表已完全載入',
        '嘗試重新整理頁面',
        '暫時關閉圖表匯出選項'
      ]
    };
  }
  
  if (errorLower.includes('parse') || errorLower.includes('format')) {
    return {
      message: '資料格式錯誤',
      suggestions: [
        '檢查資料完整性',
        '嘗試重新載入資料',
        '聯繫技術支援'
      ]
    };
  }
  
  // Default error handling
  return {
    message: '匯出過程中發生錯誤',
    suggestions: [
      '稍後再試',
      '重新整理頁面',
      '檢查瀏覽器控制台錯誤訊息',
      '如問題持續發生，請聯繫技術支援'
    ]
  };
}

/**
 * Validate export environment
 */
export function validateExportEnvironment(): {
  isValid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  // Check browser support
  if (!window.Blob) {
    errors.push('瀏覽器不支援檔案下載功能');
  }
  
  if (!window.URL || !window.URL.createObjectURL) {
    errors.push('瀏覽器不支援檔案 URL 生成');
  }
  
  // Check available memory (rough estimation)
  if (performance && (performance as any).memory) {
    const memory = (performance as any).memory;
    const availableMemory = memory.jsHeapSizeLimit - memory.usedJSHeapSize;
    const availableMB = availableMemory / (1024 * 1024);
    
    if (availableMB < 50) {
      warnings.push('可用記憶體較少，大量資料匯出可能失敗');
    }
  }
  
  // Check local storage availability
  try {
    localStorage.setItem('test', 'test');
    localStorage.removeItem('test');
  } catch (e) {
    warnings.push('本地儲存不可用，無法保存匯出設定');
  }
  
  return {
    isValid: errors.length === 0,
    warnings,
    errors
  };
}