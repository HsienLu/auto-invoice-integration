import { useState } from 'react';
import { FileText, CheckCircle, AlertCircle, Clock, Trash2, RefreshCw } from 'lucide-react';
import { useInvoiceStore } from '@/store';
import { FileInfo } from '@/types';
import { FileListSkeleton } from './LoadingStates';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface FileListProps {
  onReprocessFile?: (fileId: string) => void;
}

export function FileList({ onReprocessFile }: FileListProps) {
  const { files, removeFile, isLoading } = useInvoiceStore();
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; file: FileInfo | null }>({
    open: false,
    file: null
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getStatusIcon = (status: FileInfo['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: FileInfo['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default">已完成</Badge>;
      case 'error':
        return <Badge variant="destructive">錯誤</Badge>;
      case 'processing':
        return <Badge variant="secondary">處理中</Badge>;
      default:
        return <Badge variant="outline">未知</Badge>;
    }
  };

  const handleDeleteClick = (file: FileInfo) => {
    setDeleteDialog({ open: true, file });
  };

  const handleDeleteConfirm = () => {
    if (deleteDialog.file) {
      removeFile(deleteDialog.file.id);
      setDeleteDialog({ open: false, file: null });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ open: false, file: null });
  };

  const handleReprocess = (file: FileInfo) => {
    if (onReprocessFile) {
      onReprocessFile(file.id);
    }
  };

  // Loading state
  if (isLoading && files.length === 0) {
    return <FileListSkeleton />;
  }

  if (files.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            已上傳的檔案
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
            <p className="text-muted-foreground">尚未上傳任何檔案</p>
            <p className="text-sm text-muted-foreground mt-1">
              上傳您的第一個發票 CSV 檔案開始使用
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              已上傳的檔案
              <Badge variant="secondary">{files.length}</Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>檔案名稱</TableHead>
                <TableHead>大小</TableHead>
                <TableHead>上傳時間</TableHead>
                <TableHead>發票數量</TableHead>
                <TableHead>狀態</TableHead>
                <TableHead className="w-24">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.map((file) => (
                <TableRow key={file.id}>
                  <TableCell>
                    {getStatusIcon(file.status)}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{file.fileName}</div>
                    {file.lastProcessedDate && file.lastProcessedDate !== file.uploadDate && (
                      <div className="text-xs text-muted-foreground mt-1">
                        最後處理: {formatDate(file.lastProcessedDate)}
                      </div>
                    )}
                    {file.errorMessage && (
                      <div className="text-xs text-red-500 mt-1">
                        {file.errorMessage}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatFileSize(file.fileSize)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(file.uploadDate)}
                  </TableCell>
                  <TableCell>
                    {file.status === 'completed' ? (
                      <span className="font-medium">{file.invoiceCount} 筆</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(file.status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {(file.status === 'error' || file.status === 'completed') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReprocess(file)}
                          className="h-8 w-8 p-0"
                          title={file.originalFileData ? "重新處理" : "重新處理 (需重新上傳)"}
                          disabled={!file.originalFileData}
                        >
                          <RefreshCw className={`h-3 w-3 ${!file.originalFileData ? 'opacity-50' : ''}`} />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(file)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                        title="刪除檔案"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => !open && handleDeleteCancel()}>
        <DialogContent onClose={handleDeleteCancel}>
          <DialogHeader>
            <DialogTitle>確認刪除檔案</DialogTitle>
            <DialogDescription>
              您確定要刪除檔案 "{deleteDialog.file?.fileName}" 嗎？
              <br />
              此操作將會移除檔案及其相關的發票資料，且無法復原。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleDeleteCancel}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              確認刪除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}