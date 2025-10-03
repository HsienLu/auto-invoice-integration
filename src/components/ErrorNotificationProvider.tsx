import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { errorService, AppError } from '@/lib/errorService';
import { ErrorToast } from './ErrorMessage';

interface ErrorNotificationContextType {
  showError: (error: AppError) => void;
  hideError: () => void;
  currentError: AppError | null;
}

const ErrorNotificationContext = createContext<ErrorNotificationContextType | undefined>(undefined);

interface ErrorNotificationProviderProps {
  children: ReactNode;
}

export function ErrorNotificationProvider({ children }: ErrorNotificationProviderProps) {
  const [currentError, setCurrentError] = useState<AppError | null>(null);
  const [errorQueue, setErrorQueue] = useState<AppError[]>([]);

  useEffect(() => {
    // Subscribe to error service
    const unsubscribe = errorService.subscribe((error) => {
      setErrorQueue(prev => [...prev, error]);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    // Show next error in queue if no current error is displayed
    if (!currentError && errorQueue.length > 0) {
      const nextError = errorQueue[0];
      setCurrentError(nextError);
      setErrorQueue(prev => prev.slice(1));

      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        setCurrentError(null);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [currentError, errorQueue]);

  const showError = (error: AppError) => {
    setErrorQueue(prev => [...prev, error]);
  };

  const hideError = () => {
    setCurrentError(null);
  };

  const contextValue: ErrorNotificationContextType = {
    showError,
    hideError,
    currentError,
  };

  return (
    <ErrorNotificationContext.Provider value={contextValue}>
      {children}
      {currentError && (
        <ErrorToast
          type={currentError.type}
          message={currentError.message}
          onDismiss={hideError}
        />
      )}
    </ErrorNotificationContext.Provider>
  );
}

export function useErrorNotification() {
  const context = useContext(ErrorNotificationContext);
  if (context === undefined) {
    throw new Error('useErrorNotification must be used within an ErrorNotificationProvider');
  }
  return context;
}