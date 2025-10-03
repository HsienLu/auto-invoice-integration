import { AlertTriangle, RefreshCw, FileX, Upload, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export type ErrorType = 
  | 'file-format'
  | 'file-size'
  | 'file-encoding'
  | 'parse-error'
  | 'network-error'
  | 'storage-error'
  | 'generic';

interface ErrorMessageProps {
  type: ErrorType;
  message: string;
  details?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

const errorConfig = {
  'file-format': {
    icon: FileX,
    title: '檔案格式錯誤',
    suggestions: [
      '請確認上傳的是 CSV 格式檔案',
      '檔案應包含發票的 M 行（主要資訊）和 D 行（明細資訊）',
      '請檢查檔案是否從正確的發票系統匯出',
    ],
  },
  'file-size': {
    icon: Upload,
    title: '檔案過大',
    suggestions: [
      '請將大檔案分割成較小的檔案（建議小於 10MB）',
      '可以按月份或季度分別匯出發票資料',
      '移除不必要的欄位或資料',
    ],
  },
  'file-encoding': {
    icon: FileX,
    title: '檔案編碼問題',
    suggestions: [
      '請確認檔案使用 UTF-8 編碼',
      '如果是 Excel 檔案，請另存為 CSV (UTF-8) 格式',
      '避免使用包含特殊字元的檔案名稱',
    ],
  },
  'parse-error': {
    icon: AlertTriangle,
    title: '資料解析錯誤',
    suggestions: [
      '檢查 CSV 檔案中是否有缺失的必要欄位',
      '確認日期格式正確（YYYY-MM-DD 或 YYYY/MM/DD）',
      '檢查金額欄位是否為有效數字',
    ],
  },
  'network-error': {
    icon: AlertTriangle,
    title: '網路連線問題',
    suggestions: [
      '請檢查網路連線狀態',
      '稍後再試一次',
      '如果問題持續，請聯繫技術支援',
    ],
  },
  'storage-error': {
    icon: AlertTriangle,
    title: '儲存空間問題',
    suggestions: [
      '瀏覽器儲存空間可能已滿',
      '請清理瀏覽器快取和資料',
      '嘗試使用無痕模式',
    ],
  },
  'generic': {
    icon: HelpCircle,
    title: '發生錯誤',
    suggestions: [
      '請重新載入頁面',
      '檢查瀏覽器是否為最新版本',
      '如果問題持續，請聯繫技術支援',
    ],
  },
};

export function ErrorMessage({ 
  type, 
  message, 
  details, 
  onRetry, 
  onDismiss, 
  className 
}: ErrorMessageProps) {
  const config = errorConfig[type];
  const Icon = config.icon;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-red-100 rounded-full">
            <Icon className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold text-red-900">
              {config.title}
            </CardTitle>
            <CardDescription className="text-red-700">
              {message}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {details && (
          <Alert>
            <AlertDescription className="text-sm">
              <strong>詳細資訊：</strong> {details}
            </AlertDescription>
          </Alert>
        )}
        
        <div>
          <h4 className="font-medium text-gray-900 mb-2">建議解決方案：</h4>
          <ul className="space-y-1 text-sm text-gray-700">
            {config.suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start space-x-2">
                <span className="text-gray-400 mt-1">•</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex space-x-2 pt-2">
          {onRetry && (
            <Button onClick={onRetry} size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              重試
            </Button>
          )}
          {onDismiss && (
            <Button variant="outline" onClick={onDismiss} size="sm">
              關閉
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Inline error message for smaller spaces
export function InlineErrorMessage({ 
  type, 
  message, 
  onRetry, 
  className 
}: Omit<ErrorMessageProps, 'details' | 'onDismiss'>) {
  const config = errorConfig[type];
  const Icon = config.icon;

  return (
    <Alert className={`border-red-200 bg-red-50 ${className}`}>
      <Icon className="w-4 h-4 text-red-600" />
      <AlertDescription className="flex items-center justify-between">
        <span className="text-red-800">{message}</span>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="ml-2">
            <RefreshCw className="w-3 h-3 mr-1" />
            重試
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

// Toast-style error notification
export function ErrorToast({ 
  type, 
  message, 
  onDismiss 
}: Pick<ErrorMessageProps, 'type' | 'message' | 'onDismiss'>) {
  const config = errorConfig[type];
  const Icon = config.icon;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Icon className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-red-900">{config.title}</p>
              <p className="text-sm text-red-700">{message}</p>
            </div>
            {onDismiss && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onDismiss}
                className="text-red-600 hover:text-red-800"
              >
                ✕
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}