import { useEffect, useState } from 'react';
import { 
  useExportProgressStore, 
  formatExportStatusMessage,
  getUserFriendlyErrorMessage,
  retryExport,
  ExportProgress 
} from '@/lib/exportProgressService';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  X, 
  RefreshCw,
  FileText,
  Table
} from 'lucide-react';

interface ExportProgressNotificationProps {
  className?: string;
}

export function ExportProgressNotification({ className }: ExportProgressNotificationProps) {
  const { exports, removeExport, clearCompleted } = useExportProgressStore();
  const [visibleExports, setVisibleExports] = useState<ExportProgress[]>([]);

  useEffect(() => {
    const activeExports = Object.values(exports).filter(
      (exportItem) => 
        exportItem.status !== 'completed' || 
        (exportItem.endTime && Date.now() - exportItem.endTime.getTime() < 5000) // Show completed for 5 seconds
    );
    setVisibleExports(activeExports);
  }, [exports]);

  const handleRetry = (exportId: string) => {
    const success = retryExport(exportId);
    if (!success) {
      // Handle retry failure - maybe show a message
      console.warn('Cannot retry export:', exportId);
    }
  };

  const handleDismiss = (exportId: string) => {
    removeExport(exportId);
  };

  const getExportIcon = (type: 'csv' | 'pdf') => {
    return type === 'csv' ? (
      <Table className="h-4 w-4" />
    ) : (
      <FileText className="h-4 w-4" />
    );
  };

  const getStatusIcon = (status: ExportProgress['status']) => {
    switch (status) {
      case 'preparing':
      case 'processing':
      case 'generating':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  if (visibleExports.length === 0) {
    return null;
  }

  return (
    <div className={`fixed top-4 right-4 z-50 space-y-2 ${className}`}>
      {visibleExports.map((exportItem) => {
        const errorInfo = exportItem.error 
          ? getUserFriendlyErrorMessage(exportItem.error)
          : null;

        return (
          <Alert 
            key={exportItem.id}
            variant={exportItem.status === 'error' ? 'destructive' : 'default'}
            className="w-80 shadow-lg"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2 flex-1">
                {getExportIcon(exportItem.type)}
                {getStatusIcon(exportItem.status)}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">
                    {exportItem.type === 'csv' ? 'CSV 匯出' : 'PDF 匯出'}
                  </div>
                  <AlertDescription className="text-xs mt-1">
                    {formatExportStatusMessage(exportItem)}
                  </AlertDescription>
                </div>
              </div>
              
              <div className="flex items-center space-x-1 ml-2">
                {exportItem.status === 'error' && exportItem.retryCount < exportItem.maxRetries && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRetry(exportItem.id)}
                    className="h-6 w-6 p-0"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDismiss(exportItem.id)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Progress bar for active exports */}
            {(exportItem.status === 'processing' || exportItem.status === 'generating') && (
              <div className="mt-2">
                <Progress value={exportItem.progress} className="h-2" />
              </div>
            )}

            {/* Error details and suggestions */}
            {exportItem.status === 'error' && errorInfo && (
              <div className="mt-2 space-y-2">
                <div className="text-xs text-muted-foreground">
                  {errorInfo.message}
                </div>
                {errorInfo.suggestions.length > 0 && (
                  <div className="text-xs">
                    <div className="font-medium mb-1">建議解決方案:</div>
                    <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                      {errorInfo.suggestions.map((suggestion, index) => (
                        <li key={index}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {exportItem.retryCount < exportItem.maxRetries && (
                  <div className="text-xs text-muted-foreground">
                    重試次數: {exportItem.retryCount}/{exportItem.maxRetries}
                  </div>
                )}
              </div>
            )}
          </Alert>
        );
      })}

      {/* Clear all completed button */}
      {Object.values(exports).some(e => e.status === 'completed') && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearCompleted}
            className="text-xs"
          >
            清除已完成
          </Button>
        </div>
      )}
    </div>
  );
}