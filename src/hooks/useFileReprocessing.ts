import { useCallback, useState } from 'react';
import { useInvoiceStore } from '@/store';
import { csvService } from '@/lib/csvService';

interface UseFileReprocessingReturn {
  reprocessFile: (fileId: string) => Promise<boolean>;
  isReprocessing: boolean;
  reprocessingFileId: string | null;
  getReprocessingSuggestions: (fileId: string) => string[];
}

export function useFileReprocessing(): UseFileReprocessingReturn {
  const { files, refreshStatistics } = useInvoiceStore();
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [reprocessingFileId, setReprocessingFileId] = useState<string | null>(null);

  const reprocessFile = useCallback(async (fileId: string): Promise<boolean> => {
    const fileInfo = files.find(f => f.id === fileId);
    if (!fileInfo) {
      console.error('File not found:', fileId);
      return false;
    }

    setIsReprocessing(true);
    setReprocessingFileId(fileId);

    try {
      const result = await csvService.reprocessFile(fileId, {
        skipErrors: true,
        onProgress: (progress, message) => {
          console.log(`Reprocessing progress: ${progress}% - ${message}`);
        }
      });

      if (result.success) {
        // Refresh statistics after successful reprocessing
        refreshStatistics();
      }

      return result.success;
    } catch (error) {
      console.error('Error reprocessing file:', error);
      return false;
    } finally {
      setIsReprocessing(false);
      setReprocessingFileId(null);
    }
  }, [files, refreshStatistics]);

  const getReprocessingSuggestions = useCallback((fileId: string): string[] => {
    const fileInfo = files.find(f => f.id === fileId);
    if (!fileInfo) {
      return [];
    }

    const suggestions: string[] = [];

    if (fileInfo.status === 'error') {
      if (!fileInfo.originalFileData) {
        suggestions.push('原始檔案資料未保存，建議刪除後重新上傳檔案');
        suggestions.push('確保檔案格式正確（CSV格式，包含M行和D行資料）');
      } else {
        suggestions.push('重新處理可能解決暫時性錯誤');
        suggestions.push('檢查檔案是否包含正確的發票資料格式');
      }
      
      if (fileInfo.errorMessage) {
        if (fileInfo.errorMessage.includes('編碼')) {
          suggestions.push('檔案編碼可能有問題，請確保使用UTF-8或Big5編碼');
        }
        if (fileInfo.errorMessage.includes('格式')) {
          suggestions.push('檔案格式不正確，請確認是從電子發票載具平台匯出的CSV檔案');
        }
        if (fileInfo.errorMessage.includes('大小')) {
          suggestions.push('檔案過大，請分割檔案或移除不必要的資料');
        }
      }
    } else if (fileInfo.status === 'completed' && fileInfo.invoiceCount === 0) {
      suggestions.push('檔案解析成功但未找到發票資料，請檢查檔案內容');
      suggestions.push('確認檔案包含M行（發票主要資訊）和D行（明細資訊）');
    } else if (fileInfo.status === 'completed') {
      suggestions.push('重新處理將更新統計資料並重新解析檔案');
      suggestions.push('如果發現資料有誤，可以重新處理來修正');
    }

    return suggestions;
  }, [files]);

  return {
    reprocessFile,
    isReprocessing,
    reprocessingFileId,
    getReprocessingSuggestions
  };
}