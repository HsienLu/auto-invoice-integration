import { parseInvoiceCSV, validateCSVFile, createFileInfo, type ParseOptions } from './csvParser';
import { useInvoiceStore } from '@/store';
import { errorService } from './errorService';
import { FileInfo } from '@/types';

/**
 * CSV parsing service that integrates with the store
 */
export class CSVService {
  private static instance: CSVService;
  
  static getInstance(): CSVService {
    if (!CSVService.instance) {
      CSVService.instance = new CSVService();
    }
    return CSVService.instance;
  }

  /**
   * Process a CSV file and update the store
   */
  async processFile(
    file: File, 
    options: ParseOptions = {},
    storeOriginalFile: boolean = true
  ): Promise<{ success: boolean; fileInfo: FileInfo; invoices: any[]; errors?: string[] }> {
    const store = useInvoiceStore.getState();
    
    try {
      // Set loading state
      store.setLoading(true);
      store.setError(null);

      // Validate file first
      const validation = validateCSVFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Store original file data if requested (for reprocessing)
      let originalFileData: string | undefined;
      if (storeOriginalFile && file.size <= 5 * 1024 * 1024) { // Only store files <= 5MB
        try {
          const arrayBuffer = await file.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          originalFileData = btoa(String.fromCharCode(...uint8Array));
        } catch (error) {
          console.warn('Failed to store original file data:', error);
        }
      }

      // Create initial file info
      const initialFileInfo: FileInfo = {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36),
        fileName: file.name,
        uploadDate: new Date(),
        fileSize: file.size,
        status: 'processing',
        invoiceCount: 0,
        originalFileData,
        lastProcessedDate: new Date(),
      };

      // Add file to store
      store.addFile(initialFileInfo);

      // Parse the CSV file
      const parseResult = await parseInvoiceCSV(file, {
        ...options,
        onProgress: (progress, message) => {
          // Update file status during processing
          store.updateFile(initialFileInfo.id, {
            status: 'processing',
          });
          
          // Call user's progress callback if provided
          options.onProgress?.(progress, message);
        },
      });

      // Create final file info
      const finalFileInfo = createFileInfo(file, parseResult);
      finalFileInfo.id = initialFileInfo.id; // Keep the same ID

      // Update file info in store
      store.updateFile(initialFileInfo.id, finalFileInfo);

      if (parseResult.success && parseResult.invoices.length > 0) {
        // Add invoices to store
        store.addInvoices(parseResult.invoices);
        
        return {
          success: true,
          fileInfo: finalFileInfo,
          invoices: parseResult.invoices,
        };
      } else {
        // Handle parsing errors
        const errorMessages = parseResult.errors.map(error => 
          `第${error.row}行: ${error.message}`
        );
        
        const parseError = errorService.createError(
          'parse-error',
          `檔案解析失敗: ${errorMessages.slice(0, 5).join(', ')}${errorMessages.length > 5 ? '...' : ''}`,
          `檔案: ${file.name}`
        );
        store.setError(parseError.message);
        
        return {
          success: false,
          fileInfo: finalFileInfo,
          invoices: [],
          errors: errorMessages,
        };
      }
    } catch (error) {
      const appError = errorService.handleFileError(error, file.name);
      store.setError(appError.message);
      
      // If we have a file info, update it with error status
      const existingFiles = store.files;
      const fileInfo = existingFiles.find(f => f.fileName === file.name);
      if (fileInfo) {
        store.updateFile(fileInfo.id, {
          status: 'error',
          errorMessage: appError.message,
        });
      }
      
      return {
        success: false,
        fileInfo: fileInfo || {
          id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36),
          fileName: file.name,
          uploadDate: new Date(),
          fileSize: file.size,
          status: 'error',
          invoiceCount: 0,
          errorMessage: appError.message,
        },
        invoices: [],
        errors: [appError.message],
      };
    } finally {
      store.setLoading(false);
    }
  }

  /**
   * Process multiple files
   */
  async processFiles(
    files: File[], 
    options: ParseOptions = {}
  ): Promise<Array<{ success: boolean; fileInfo: FileInfo; invoices: any[]; errors?: string[] }>> {
    const results = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      const fileOptions: ParseOptions = {
        ...options,
        onProgress: (progress, message) => {
          const overallProgress = ((i / files.length) * 100) + (progress / files.length);
          const overallMessage = `處理檔案 ${i + 1}/${files.length}: ${message}`;
          options.onProgress?.(overallProgress, overallMessage);
        },
      };
      
      const result = await this.processFile(file, fileOptions);
      results.push(result);
      
      // If processing fails and user doesn't want to skip errors, stop
      if (!result.success && !options.skipErrors) {
        break;
      }
    }
    
    return results;
  }

  /**
   * Reprocess an existing file
   */
  async reprocessFile(
    fileId: string, 
    options: ParseOptions = {}
  ): Promise<{ success: boolean; fileInfo: FileInfo; invoices: any[]; errors?: string[] }> {
    const store = useInvoiceStore.getState();
    const fileInfo = store.files.find(f => f.id === fileId);
    
    if (!fileInfo) {
      throw new Error('找不到指定的檔案');
    }

    if (!fileInfo.originalFileData) {
      throw new Error('無法重新處理：原始檔案資料未保存，請重新上傳檔案');
    }

    try {
      // Set processing state
      store.setLoading(true);
      store.setError(null);
      
      // Update file status to processing
      store.updateFile(fileId, {
        status: 'processing',
        errorMessage: undefined,
        lastProcessedDate: new Date(),
      });

      // Convert base64 back to File object
      const binaryString = atob(fileInfo.originalFileData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'text/csv' });
      const file = new File([blob], fileInfo.fileName, { type: 'text/csv' });

      // Remove old invoices associated with this file
      const remainingInvoices = store.invoices.filter(invoice => 
        !invoice.id.startsWith(`${fileInfo.fileName}_`)
      );
      
      // Update store with remaining invoices
      store.setInvoices(remainingInvoices);

      // Parse the file again
      const parseResult = await parseInvoiceCSV(file, {
        ...options,
        onProgress: (progress, message) => {
          // Update file status during processing
          store.updateFile(fileId, {
            status: 'processing',
          });
          
          // Call user's progress callback if provided
          options.onProgress?.(progress, `重新處理: ${message}`);
        },
      });

      // Create updated file info
      const updatedFileInfo = createFileInfo(file, parseResult);
      updatedFileInfo.id = fileId; // Keep the same ID
      updatedFileInfo.originalFileData = fileInfo.originalFileData; // Keep original data
      updatedFileInfo.uploadDate = fileInfo.uploadDate; // Keep original upload date
      updatedFileInfo.lastProcessedDate = new Date(); // Update processing date

      // Update file info in store
      store.updateFile(fileId, updatedFileInfo);

      if (parseResult.success && parseResult.invoices.length > 0) {
        // Add new invoices to store
        store.addInvoices(parseResult.invoices);
        
        return {
          success: true,
          fileInfo: updatedFileInfo,
          invoices: parseResult.invoices,
        };
      } else {
        // Handle parsing errors
        const errorMessages = parseResult.errors.map(error => 
          `第${error.row}行: ${error.message}`
        );
        
        const reprocessError = errorService.createError(
          'parse-error',
          `重新處理失敗: ${errorMessages.slice(0, 3).join(', ')}${errorMessages.length > 3 ? '...' : ''}`,
          `檔案: ${fileInfo?.fileName}`
        );
        store.setError(reprocessError.message);
        
        return {
          success: false,
          fileInfo: updatedFileInfo,
          invoices: [],
          errors: errorMessages,
        };
      }
    } catch (error) {
      const appError = errorService.handleFileError(error, fileInfo?.fileName);
      store.setError(appError.message);
      
      // Update file with error status
      store.updateFile(fileId, {
        status: 'error',
        errorMessage: appError.message,
        lastProcessedDate: new Date(),
      });
      
      return {
        success: false,
        fileInfo: fileInfo,
        invoices: [],
        errors: [appError.message],
      };
    } finally {
      store.setLoading(false);
    }
  }

  /**
   * Remove a file and its associated invoices
   */
  removeFile(fileId: string): void {
    const store = useInvoiceStore.getState();
    
    // Remove file from store (this will also remove associated invoices)
    store.removeFile(fileId);
  }

  /**
   * Get processing statistics
   */
  getProcessingStats(): {
    totalFiles: number;
    completedFiles: number;
    errorFiles: number;
    processingFiles: number;
    totalInvoices: number;
  } {
    const store = useInvoiceStore.getState();
    const files = store.files;
    
    return {
      totalFiles: files.length,
      completedFiles: files.filter(f => f.status === 'completed').length,
      errorFiles: files.filter(f => f.status === 'error').length,
      processingFiles: files.filter(f => f.status === 'processing').length,
      totalInvoices: store.invoices.length,
    };
  }
}

// Export singleton instance
export const csvService = CSVService.getInstance();