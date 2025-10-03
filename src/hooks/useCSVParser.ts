import { useState, useCallback } from 'react';
import { csvService } from '@/lib/csvService';
import { FileInfo } from '@/types';
import { type ParseOptions } from '@/lib/csvParser';

interface UseCSVParserReturn {
  isProcessing: boolean;
  progress: number;
  progressMessage: string;
  processFile: (file: File, options?: ParseOptions) => Promise<{ success: boolean; fileInfo: FileInfo; invoices: any[]; errors?: string[] }>;
  processFiles: (files: File[], options?: ParseOptions) => Promise<Array<{ success: boolean; fileInfo: FileInfo; invoices: any[]; errors?: string[] }>>;
  removeFile: (fileId: string) => void;
  getStats: () => {
    totalFiles: number;
    completedFiles: number;
    errorFiles: number;
    processingFiles: number;
    totalInvoices: number;
  };
}

export function useCSVParser(): UseCSVParserReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');

  const processFile = useCallback(async (file: File, options: ParseOptions = {}) => {
    setIsProcessing(true);
    setProgress(0);
    setProgressMessage('準備處理檔案...');

    try {
      const result = await csvService.processFile(file, {
        ...options,
        onProgress: (prog, message) => {
          setProgress(prog);
          setProgressMessage(message);
          options.onProgress?.(prog, message);
        },
      });

      return result;
    } finally {
      setIsProcessing(false);
      setProgress(100);
      setProgressMessage('處理完成');
    }
  }, []);

  const processFiles = useCallback(async (files: File[], options: ParseOptions = {}) => {
    setIsProcessing(true);
    setProgress(0);
    setProgressMessage('準備處理多個檔案...');

    try {
      const results = await csvService.processFiles(files, {
        ...options,
        onProgress: (prog, message) => {
          setProgress(prog);
          setProgressMessage(message);
          options.onProgress?.(prog, message);
        },
      });

      return results;
    } finally {
      setIsProcessing(false);
      setProgress(100);
      setProgressMessage('所有檔案處理完成');
    }
  }, []);

  const removeFile = useCallback((fileId: string) => {
    csvService.removeFile(fileId);
  }, []);

  const getStats = useCallback(() => {
    return csvService.getProcessingStats();
  }, []);

  return {
    isProcessing,
    progress,
    progressMessage,
    processFile,
    processFiles,
    removeFile,
    getStats,
  };
}