import Papa from 'papaparse';
import { Invoice, InvoiceItem, FileInfo } from '@/types';
import { categorizeItem, generateId } from './utils';
import { memoryOptimizer } from './memoryOptimizer';

// CSV parsing result interface
export interface ParseResult {
  success: boolean;
  invoices: Invoice[];
  errors: ParseError[];
  totalRows: number;
  processedRows: number;
}

export interface ParseError {
  row: number;
  field?: string;
  message: string;
  data?: any;
}

// Progress callback type
export type ProgressCallback = (progress: number, message: string) => void;

// CSV parsing options
export interface ParseOptions {
  onProgress?: ProgressCallback;
  skipErrors?: boolean;
  maxErrors?: number;
}

/**
 * Parse CSV file containing Taiwan electronic invoice data
 * Supports M-line (main invoice) and D-line (detail items) format
 */
export async function parseInvoiceCSV(
  file: File,
  options: ParseOptions = {}
): Promise<ParseResult> {
  const { onProgress, skipErrors = true, maxErrors = 100 } = options;
  
  return new Promise((resolve) => {
    const errors: ParseError[] = [];
    const invoiceMap = new Map<string, Partial<Invoice>>();
    const itemsMap = new Map<string, InvoiceItem[]>();
    let totalRows = 0;
    let processedRows = 0;

    // Report initial progress
    onProgress?.(0, '開始解析檔案...');

    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      chunk: (results) => {
        totalRows += results.data.length;
        
        results.data.forEach((row: any, index: number) => {
          try {
            const rowData = Array.isArray(row) ? row : Object.values(row);
            const lineType = rowData[0]?.toString().trim();
            
            if (lineType === 'M') {
              // Parse main invoice data (M-line)
              const invoice = parseMLine(rowData, totalRows - results.data.length + index + 1);
              if (invoice) {
                invoiceMap.set(invoice.invoiceNumber!, invoice);
                processedRows++;
              }
            } else if (lineType === 'D') {
              // Parse detail item data (D-line)
              const item = parseDLine(rowData, totalRows - results.data.length + index + 1);
              if (item) {
                const items = itemsMap.get(item.invoiceNumber) || [];
                items.push(item);
                itemsMap.set(item.invoiceNumber, items);
                processedRows++;
              }
            }
          } catch (error) {
            const parseError: ParseError = {
              row: totalRows - results.data.length + index + 1,
              message: error instanceof Error ? error.message : '未知錯誤',
              data: row,
            };
            errors.push(parseError);
            
            if (!skipErrors || errors.length >= maxErrors) {
              return;
            }
          }
        });

        // Report progress
        const progress = Math.min((processedRows / Math.max(totalRows, 1)) * 80, 80);
        onProgress?.(progress, `已處理 ${processedRows} 筆資料...`);
      },
      complete: async () => {
        onProgress?.(85, '整合發票資料...');
        
        try {
          // Use memory optimizer to process invoices in chunks
          const invoiceEntries = Array.from(invoiceMap.entries());
          
          const invoices = await memoryOptimizer.processInChunks(
            invoiceEntries,
            async (chunk) => {
              const chunkInvoices: Invoice[] = [];
              
              for (const [invoiceNumber, invoiceData] of chunk) {
                try {
                  const items = itemsMap.get(invoiceNumber) || [];
                  
                  // Validate required fields
                  if (!invoiceData.invoiceNumber || !invoiceData.invoiceDate || !invoiceData.merchantName) {
                    errors.push({
                      row: -1,
                      message: `發票 ${invoiceNumber} 缺少必要欄位`,
                      data: invoiceData,
                    });
                    continue;
                  }

                  const invoice: Invoice = {
                    id: generateId(),
                    carrierType: invoiceData.carrierType || '',
                    carrierNumber: invoiceData.carrierNumber || '',
                    invoiceDate: invoiceData.invoiceDate!,
                    merchantId: invoiceData.merchantId || '',
                    merchantName: invoiceData.merchantName!,
                    invoiceNumber: invoiceData.invoiceNumber!,
                    totalAmount: invoiceData.totalAmount || 0,
                    status: invoiceData.status || 'issued',
                    items: items,
                  };

                  chunkInvoices.push(invoice);
                } catch (error) {
                  errors.push({
                    row: -1,
                    message: `處理發票 ${invoiceNumber} 時發生錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`,
                    data: invoiceData,
                  });
                }
              }
              
              return chunkInvoices;
            },
            { chunkSize: 500, enableGarbageCollection: true }
          );

          // Optimize the final invoice data
          const optimizedInvoices = memoryOptimizer.optimizeInvoiceData(invoices);

          // Clean up temporary maps to free memory
          memoryOptimizer.cleanup([invoiceMap, itemsMap]);

          onProgress?.(100, '解析完成');

          resolve({
            success: errors.length === 0 || (skipErrors && optimizedInvoices.length > 0),
            invoices: optimizedInvoices,
            errors,
            totalRows,
            processedRows: optimizedInvoices.length,
          });
        } catch (error) {
          resolve({
            success: false,
            invoices: [],
            errors: [{
              row: -1,
              message: `資料整合失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
            }],
            totalRows,
            processedRows: 0,
          });
        }
      },
      error: (error) => {
        resolve({
          success: false,
          invoices: [],
          errors: [{
            row: -1,
            message: `檔案解析失敗: ${error.message}`,
          }],
          totalRows: 0,
          processedRows: 0,
        });
      },
    });
  });
}

/**
 * Parse M-line (main invoice data)
 * Format: M,載具類型,載具號碼,發票日期,商店統編,商店名稱,發票號碼,總金額,狀態
 */
function parseMLine(row: any[], rowNumber: number): Partial<Invoice> | null {
  try {
    if (row.length < 8) {
      throw new Error(`M行資料欄位不足，需要至少8個欄位，實際只有${row.length}個`);
    }

    const [, carrierType, carrierNumber, invoiceDateStr, merchantId, merchantName, invoiceNumber, totalAmountStr, statusStr] = row;

    // Parse and validate date
    const invoiceDate = parseInvoiceDate(invoiceDateStr?.toString().trim());
    if (!invoiceDate) {
      throw new Error(`無效的發票日期格式: ${invoiceDateStr}`);
    }

    // Parse and validate amount
    const totalAmount = parseFloat(totalAmountStr?.toString().replace(/[^\d.-]/g, '') || '0');
    if (isNaN(totalAmount)) {
      throw new Error(`無效的金額格式: ${totalAmountStr}`);
    }

    // Parse status
    const status = parseInvoiceStatus(statusStr?.toString().trim());

    return {
      carrierType: carrierType?.toString().trim() || '',
      carrierNumber: carrierNumber?.toString().trim() || '',
      invoiceDate,
      merchantId: merchantId?.toString().trim() || '',
      merchantName: merchantName?.toString().trim() || '',
      invoiceNumber: invoiceNumber?.toString().trim() || '',
      totalAmount,
      status,
    };
  } catch (error) {
    throw new Error(`第${rowNumber}行M行解析錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`);
  }
}

/**
 * Parse D-line (detail item data)
 * Format usually follows: D,發票號碼,小計金額,品項名稱
 * Some exports use the legacy order D,發票號碼,品項名稱,小計金額 – we support both.
 */
function parseDLine(row: any[], rowNumber: number): InvoiceItem | null {
  try {
    if (row.length < 4) {
      throw new Error(`D行資料欄位不足，需要至少4個欄位，實際只有${row.length}個`);
    }

    const [, rawInvoiceNumber, thirdValue, fourthValue] = row;

    const invoiceNumber = rawInvoiceNumber?.toString().trim();
    const third = thirdValue?.toString().trim() ?? '';
    const fourth = fourthValue?.toString().trim() ?? '';

    const numericPattern = /^-?\d+(?:\.\d+)?$/;
    const thirdLooksAmount = numericPattern.test(third.replace(/,/g, ''));
    const fourthLooksAmount = numericPattern.test(fourth.replace(/,/g, ''));

    let itemName = third;
    let amountStr = fourth;

    if (thirdLooksAmount && !fourthLooksAmount) {
      // New format: amount comes before item name
      itemName = fourth;
      amountStr = third;
    } else if (!thirdLooksAmount && fourthLooksAmount) {
      // Legacy format: item name comes before amount
      itemName = third;
      amountStr = fourth;
    } else if (thirdLooksAmount && fourthLooksAmount) {
      // Both fields look numeric – fall back to assuming original order to keep validation errors meaningful
      itemName = third;
      amountStr = fourth;
    }

    // Validate required fields
    if (!invoiceNumber) {
      throw new Error('發票號碼不能為空');
    }

    if (!itemName?.toString().trim()) {
      throw new Error('品項名稱不能為空');
    }

    // Parse and validate amount
    const amount = parseFloat(amountStr?.toString().replace(/[^\d.-]/g, '') || '0');
    if (isNaN(amount)) {
      throw new Error(`無效的金額格式: ${amountStr}`);
    }

    const cleanItemName = itemName.toString().trim();
    
    return {
      id: generateId(),
      invoiceNumber: invoiceNumber.toString().trim(),
      itemName: cleanItemName,
      amount,
      category: categorizeItem(cleanItemName),
    };
  } catch (error) {
    throw new Error(`第${rowNumber}行D行解析錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`);
  }
}

/**
 * Parse invoice date from various formats
 * Supports: YYYY/MM/DD, YYYY-MM-DD, YYYYMMDD
 */
function parseInvoiceDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  // Remove any non-digit characters except / and -
  const cleanDate = dateStr.replace(/[^\d\/-]/g, '');
  
  // Try different date formats
  const formats = [
    /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/, // YYYY/MM/DD or YYYY-MM-DD
    /^(\d{4})(\d{2})(\d{2})$/, // YYYYMMDD
  ];

  for (const format of formats) {
    const match = cleanDate.match(format);
    if (match) {
      const [, year, month, day] = match;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      
      // Validate the date
      if (date.getFullYear() == parseInt(year) && 
          date.getMonth() == parseInt(month) - 1 && 
          date.getDate() == parseInt(day)) {
        return date;
      }
    }
  }

  return null;
}

/**
 * Parse invoice status
 */
function parseInvoiceStatus(statusStr: string): 'issued' | 'voided' {
  if (!statusStr) return 'issued';
  
  const status = statusStr.toLowerCase();
  if (status.includes('作廢') || status.includes('void') || status.includes('cancel')) {
    return 'voided';
  }
  
  return 'issued';
}

/**
 * Validate CSV file before parsing
 */
export function validateCSVFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!file.type.includes('csv') && !file.name.toLowerCase().endsWith('.csv')) {
    return { valid: false, error: '請選擇CSV格式的檔案' };
  }

  // Check file size (max 50MB)
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    return { valid: false, error: '檔案大小不能超過50MB' };
  }

  // Check if file is empty
  if (file.size === 0) {
    return { valid: false, error: '檔案不能為空' };
  }

  return { valid: true };
}

/**
 * Create FileInfo from parsing result
 */
export function createFileInfo(file: File, parseResult: ParseResult): FileInfo {
  return {
    id: generateId(),
    fileName: file.name,
    uploadDate: new Date(),
    fileSize: file.size,
    status: parseResult.success ? 'completed' : 'error',
    invoiceCount: parseResult.invoices.length,
    errorMessage: parseResult.errors.length > 0 
      ? `發現 ${parseResult.errors.length} 個錯誤` 
      : undefined,
  };
}