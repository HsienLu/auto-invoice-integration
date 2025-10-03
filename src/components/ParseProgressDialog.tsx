
import { Progress } from '@/components/ui/progress';

interface ParseProgressDialogProps {
  isOpen: boolean;
  progress: number;
  message: string;
  onCancel?: () => void;
}

export function ParseProgressDialog({ 
  isOpen, 
  progress, 
  message, 
  onCancel 
}: ParseProgressDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-4">正在解析發票檔案</h3>
          
          <div className="mb-4">
            <Progress value={progress} className="w-full" />
            <div className="text-sm text-gray-600 mt-2">
              {Math.round(progress)}%
            </div>
          </div>
          
          <p className="text-sm text-gray-700 mb-4">{message}</p>
          
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
            >
              取消
            </button>
          )}
        </div>
      </div>
    </div>
  );
}