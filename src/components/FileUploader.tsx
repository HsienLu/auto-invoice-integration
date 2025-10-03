import { useCallback, useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { csvService } from '@/lib/csvService';
import { ParseProgressDialog } from './ParseProgressDialog';
import { ErrorMessage, type ErrorType } from './ErrorMessage';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface FileUploaderProps {
  onUploadComplete?: (results: Array<{ success: boolean; fileName: string; errors?: string[] }>) => void;
  multiple?: boolean;
  className?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

export function FileUploader({ 
  onUploadComplete, 
  multiple = false, 
  className = '' 
}: FileUploaderProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    show: boolean;
    files: Array<{ name: string; status: 'success' | 'error' | 'processing'; message?: string; }>
  }>({ show: false, files: [] });
  const [detailedError, setDetailedError] = useState<{
    show: boolean;
    type: ErrorType;
    message: string;
    details?: string;
  } | null>(null);

  const validateFile = (file: File): { valid: boolean; error?: string; errorType?: ErrorType } => {
    // Check file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return { valid: false, error: '僅支援 CSV 格式檔案', errorType: 'file-format' };
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return { 
        valid: false, 
        error: `檔案大小超過限制 (${(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)}MB)`,
        errorType: 'file-size'
      };
    }

    // Check if file is empty
    if (file.size === 0) {
      return { valid: false, error: '檔案不能為空', errorType: 'file-format' };
    }

    return { valid: true };
  };

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    
    // Validate all files first
    const validationResults = fileArray.map(file => ({
      file,
      validation: validateFile(file)
    }));

    const invalidFiles = validationResults.filter(result => !result.validation.valid);
    const validFiles = validationResults.filter(result => result.validation.valid);

    // Show validation errors for invalid files
    if (invalidFiles.length > 0) {
      const statusFiles = invalidFiles.map(({ file, validation }) => ({
        name: file.name,
        status: 'error' as const,
        message: validation.error
      }));
      
      setUploadStatus({ show: true, files: statusFiles });
      
      // Show detailed error for the first invalid file
      const firstError = invalidFiles[0];
      if (firstError.validation.errorType) {
        setDetailedError({
          show: true,
          type: firstError.validation.errorType,
          message: firstError.validation.error || '檔案驗證失敗',
          details: `檔案: ${firstError.file.name}`
        });
      }
      
      // Auto-hide after 5 seconds
      setTimeout(() => {
        setUploadStatus({ show: false, files: [] });
      }, 5000);
      
      if (validFiles.length === 0) return;
    }

    // Process valid files
    try {
      const processingFiles = validFiles.map(({ file }) => ({
        name: file.name,
        status: 'processing' as const,
        message: '處理中...'
      }));
      
      setUploadStatus({ show: true, files: processingFiles });
      setIsProcessing(true);

      let results;
      
      if (validFiles.length === 1) {
        const { file } = validFiles[0];
        
        const result = await csvService.processFile(file, {
          skipErrors: true,
          onProgress: (prog, msg) => {
            setProgress(prog);
            setProgressMessage(msg);
          }
        }, true); // Store original file for reprocessing

        results = [{ 
          success: result.success, 
          fileName: result.fileInfo.fileName,
          errors: result.errors 
        }];
      } else {
        const multiResults = await csvService.processFiles(validFiles.map(({ file }) => file), {
          skipErrors: true,
          onProgress: (prog, msg) => {
            setProgress(prog);
            setProgressMessage(msg);
          }
        });

        results = multiResults.map(result => ({
          success: result.success,
          fileName: result.fileInfo.fileName,
          errors: result.errors,
        }));
      }
      
      // Update upload status with results
      const statusFiles = results.map(result => ({
        name: result.fileName,
        status: result.success ? 'success' as const : 'error' as const,
        message: result.success ? '上傳成功' : result.errors?.join(', ')
      }));
      
      setUploadStatus({ show: true, files: statusFiles });
      
      // Auto-hide success messages after 3 seconds
      setTimeout(() => {
        setUploadStatus({ show: false, files: [] });
      }, 3000);
      
      onUploadComplete?.(results);
    } catch (error) {
      console.error('File processing error:', error);
      const errorMessage = error instanceof Error ? error.message : '未知錯誤';
      
      const statusFiles = validFiles.map(({ file }) => ({
        name: file.name,
        status: 'error' as const,
        message: errorMessage
      }));
      
      setUploadStatus({ show: true, files: statusFiles });
      
      // Determine error type based on error message
      let errorType: ErrorType = 'generic';
      if (errorMessage.includes('格式') || errorMessage.includes('解析')) {
        errorType = 'parse-error';
      } else if (errorMessage.includes('編碼')) {
        errorType = 'file-encoding';
      } else if (errorMessage.includes('網路') || errorMessage.includes('連線')) {
        errorType = 'network-error';
      } else if (errorMessage.includes('儲存') || errorMessage.includes('空間')) {
        errorType = 'storage-error';
      }
      
      setDetailedError({
        show: true,
        type: errorType,
        message: errorMessage,
        details: `處理檔案時發生錯誤: ${validFiles.map(f => f.file.name).join(', ')}`
      });
      
      onUploadComplete?.([{
        success: false,
        fileName: validFiles[0]?.file.name || 'unknown',
        errors: [errorMessage],
      }]);
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setProgressMessage('');
    }
  }, [onUploadComplete]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  const handleClick = useCallback(() => {
    if (!isProcessing) {
      document.getElementById('file-upload')?.click();
    }
  }, [isProcessing]);

  return (
    <>
      <div className={`relative ${className}`}>
        <Card
          className={`
            border-2 border-dashed transition-all duration-200 cursor-pointer
            ${dragActive 
              ? 'border-blue-400 bg-blue-50 shadow-md' 
              : 'border-gray-300 hover:border-gray-400 hover:shadow-sm'
            }
            ${isProcessing ? 'pointer-events-none opacity-50' : ''}
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <CardContent className="p-8">
            <input
              id="file-upload"
              type="file"
              className="hidden"
              multiple={multiple}
              accept=".csv"
              onChange={handleChange}
              disabled={isProcessing}
            />
            
            <div className="text-center space-y-4">
              <div className={`transition-colors ${dragActive ? 'text-blue-500' : 'text-gray-400'}`}>
                <Upload className="h-12 w-12 mx-auto" />
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  {dragActive ? '放開以上傳檔案' : '上傳發票檔案'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  拖放 CSV 檔案到此處，或點擊選擇檔案
                </p>
                
                <Button 
                  variant="outline" 
                  disabled={isProcessing}
                  className="mb-4"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  選擇檔案
                </Button>
                
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>支援 CSV 格式，最大檔案大小 {(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)}MB</p>
                  {multiple && <p>可同時上傳多個檔案</p>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upload Status Messages */}
        {uploadStatus.show && (
          <Card className="mt-4 border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="space-y-2">
                {uploadStatus.files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {file.status === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {file.status === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
                      {file.status === 'processing' && (
                        <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      )}
                      <span className="text-sm font-medium">{file.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={
                          file.status === 'success' ? 'default' : 
                          file.status === 'error' ? 'destructive' : 
                          'secondary'
                        }
                      >
                        {file.status === 'success' ? '成功' : 
                         file.status === 'error' ? '失敗' : 
                         '處理中'}
                      </Badge>
                    </div>
                  </div>
                ))}
                {uploadStatus.files.some(f => f.message) && (
                  <div className="mt-2 pt-2 border-t">
                    {uploadStatus.files.filter(f => f.message).map((file, index) => (
                      <p key={index} className="text-xs text-muted-foreground">
                        {file.name}: {file.message}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detailed Error Message */}
        {detailedError?.show && (
          <div className="mt-4">
            <ErrorMessage
              type={detailedError.type}
              message={detailedError.message}
              details={detailedError.details}
              onRetry={() => {
                setDetailedError(null);
                // Trigger file input click for retry
                document.getElementById('file-upload')?.click();
              }}
              onDismiss={() => setDetailedError(null)}
            />
          </div>
        )}
      </div>

      <ParseProgressDialog
        isOpen={isProcessing}
        progress={progress}
        message={progressMessage}
      />
    </>
  );
}