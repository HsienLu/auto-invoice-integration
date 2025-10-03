import { ErrorType } from '@/components/ErrorMessage';

export interface AppError {
  type: ErrorType;
  message: string;
  details?: string;
  timestamp: Date;
  stack?: string;
}

class ErrorService {
  private errors: AppError[] = [];
  private listeners: ((error: AppError) => void)[] = [];

  // Create a standardized error
  createError(
    type: ErrorType,
    message: string,
    details?: string,
    originalError?: Error
  ): AppError {
    const error: AppError = {
      type,
      message,
      details,
      timestamp: new Date(),
      stack: originalError?.stack,
    };

    this.errors.push(error);
    this.notifyListeners(error);
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('AppError:', error);
      if (originalError) {
        console.error('Original error:', originalError);
      }
    }

    return error;
  }

  // Handle file-related errors
  handleFileError(error: unknown, fileName?: string): AppError {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    let type: ErrorType = 'generic';
    let message = errorMessage;
    let details = fileName ? `檔案: ${fileName}` : undefined;

    // Categorize error based on message content
    if (errorMessage.includes('格式') || errorMessage.includes('format')) {
      type = 'file-format';
      message = '檔案格式不正確';
    } else if (errorMessage.includes('大小') || errorMessage.includes('size')) {
      type = 'file-size';
      message = '檔案大小超過限制';
    } else if (errorMessage.includes('編碼') || errorMessage.includes('encoding')) {
      type = 'file-encoding';
      message = '檔案編碼問題';
    } else if (errorMessage.includes('解析') || errorMessage.includes('parse')) {
      type = 'parse-error';
      message = '資料解析失敗';
    } else if (errorMessage.includes('網路') || errorMessage.includes('network')) {
      type = 'network-error';
      message = '網路連線問題';
    } else if (errorMessage.includes('儲存') || errorMessage.includes('storage')) {
      type = 'storage-error';
      message = '儲存空間問題';
    }

    return this.createError(type, message, details, error instanceof Error ? error : undefined);
  }

  // Handle network errors
  handleNetworkError(error: unknown): AppError {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return this.createError(
      'network-error',
      '網路連線發生問題',
      errorMessage,
      error instanceof Error ? error : undefined
    );
  }

  // Handle storage errors
  handleStorageError(error: unknown): AppError {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return this.createError(
      'storage-error',
      '資料儲存發生問題',
      errorMessage,
      error instanceof Error ? error : undefined
    );
  }

  // Handle generic errors
  handleGenericError(error: unknown, context?: string): AppError {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return this.createError(
      'generic',
      context ? `${context}: ${errorMessage}` : errorMessage,
      undefined,
      error instanceof Error ? error : undefined
    );
  }

  // Subscribe to error notifications
  subscribe(listener: (error: AppError) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Notify all listeners
  private notifyListeners(error: AppError): void {
    this.listeners.forEach(listener => {
      try {
        listener(error);
      } catch (err) {
        console.error('Error in error listener:', err);
      }
    });
  }

  // Get recent errors
  getRecentErrors(limit = 10): AppError[] {
    return this.errors
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // Clear errors
  clearErrors(): void {
    this.errors = [];
  }

  // Get error count by type
  getErrorCountByType(): Record<ErrorType, number> {
    const counts: Record<ErrorType, number> = {
      'file-format': 0,
      'file-size': 0,
      'file-encoding': 0,
      'parse-error': 0,
      'network-error': 0,
      'storage-error': 0,
      'generic': 0,
    };

    this.errors.forEach(error => {
      counts[error.type]++;
    });

    return counts;
  }
}

// Create singleton instance
export const errorService = new ErrorService();

// React hook for using error service
export function useErrorService() {
  return {
    createError: errorService.createError.bind(errorService),
    handleFileError: errorService.handleFileError.bind(errorService),
    handleNetworkError: errorService.handleNetworkError.bind(errorService),
    handleStorageError: errorService.handleStorageError.bind(errorService),
    handleGenericError: errorService.handleGenericError.bind(errorService),
    subscribe: errorService.subscribe.bind(errorService),
    getRecentErrors: errorService.getRecentErrors.bind(errorService),
    clearErrors: errorService.clearErrors.bind(errorService),
    getErrorCountByType: errorService.getErrorCountByType.bind(errorService),
  };
}