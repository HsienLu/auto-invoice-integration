
import { useState, useCallback } from 'react';
import { AlertCircle, RefreshCw, Info } from 'lucide-react';
import { FileUploader } from '@/components/FileUploader';
import { FileList } from '@/components/FileList';
import { useFileReprocessing } from '@/hooks/useFileReprocessing';
import { useInvoiceStore } from '@/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

function FileManager() {
  const { files, refreshStatistics } = useInvoiceStore();
  const { reprocessFile, isReprocessing, getReprocessingSuggestions } = useFileReprocessing();
  const [reprocessDialog, setReprocessDialog] = useState<{
    open: boolean;
    fileId: string | null;
    fileName: string | null;
    suggestions: string[];
  }>({ open: false, fileId: null, fileName: null, suggestions: [] });

  const handleUploadComplete = useCallback((results: Array<{ success: boolean; fileName: string; errors?: string[] }>) => {
    // Refresh statistics after successful uploads
    const hasSuccessfulUploads = results.some(result => result.success);
    if (hasSuccessfulUploads) {
      refreshStatistics();
    }
    
    // Log results for debugging
    console.log('Upload results:', results);
  }, [refreshStatistics]);

  const handleReprocessFile = useCallback((fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (file) {
      const suggestions = getReprocessingSuggestions(fileId);
      setReprocessDialog({
        open: true,
        fileId,
        fileName: file.fileName,
        suggestions
      });
    }
  }, [files, getReprocessingSuggestions]);

  const handleReprocessConfirm = useCallback(async () => {
    if (reprocessDialog.fileId) {
      const success = await reprocessFile(reprocessDialog.fileId);
      
      if (success) {
        refreshStatistics();
      }
      
      setReprocessDialog({ open: false, fileId: null, fileName: null, suggestions: [] });
    }
  }, [reprocessDialog.fileId, reprocessFile, refreshStatistics]);

  const handleReprocessCancel = useCallback(() => {
    setReprocessDialog({ open: false, fileId: null, fileName: null, suggestions: [] });
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="border-b pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">檔案管理</h1>
            <p className="text-muted-foreground mt-2">
              上傳和管理您的發票CSV檔案。支援電子發票載具匯出的CSV格式。
            </p>
          </div>
          {files.length > 0 && (
            <Button
              variant="outline"
              onClick={refreshStatistics}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              重新整理統計
            </Button>
          )}
        </div>
      </div>

      {/* Upload Area */}
      <FileUploader
        multiple={true}
        onUploadComplete={handleUploadComplete}
      />

      {/* File List */}
      <FileList onReprocessFile={handleReprocessFile} />

      {/* Instructions */}
      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900">檔案格式說明</h3>
              <div className="text-sm text-blue-700 mt-1 space-y-1">
                <p>請上傳從電子發票載具平台匯出的CSV檔案。檔案應包含發票主要資訊（M行）和明細資訊（D行）。</p>
                <p>支援的檔案格式：</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>CSV 格式檔案（.csv）</li>
                  <li>最大檔案大小：10MB</li>
                  <li>編碼格式：UTF-8 或 Big5</li>
                  <li>包含 M 行（發票主要資訊）和 D 行（明細資訊）</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reprocess Confirmation Dialog */}
      <Dialog open={reprocessDialog.open} onOpenChange={(open) => !open && handleReprocessCancel()}>
        <DialogContent onClose={handleReprocessCancel}>
          <DialogHeader>
            <DialogTitle>重新處理檔案</DialogTitle>
            <DialogDescription>
              您確定要重新處理檔案 "{reprocessDialog.fileName}" 嗎？
              <br />
              重新處理將會重新解析檔案並更新相關統計資料。
            </DialogDescription>
          </DialogHeader>
          
          {reprocessDialog.suggestions.length > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">處理建議：</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {reprocessDialog.suggestions.map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={handleReprocessCancel}>
              取消
            </Button>
            <Button 
              onClick={handleReprocessConfirm}
              disabled={isReprocessing}
            >
              {isReprocessing ? '處理中...' : '確認重新處理'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default FileManager;