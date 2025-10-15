import { Invoice } from '@/types';
import Papa from 'papaparse';

// Export field configuration
export interface ExportField {
  key: string;
  label: string;
  getValue: (invoice: Invoice) => string | number;
  category: 'invoice' | 'merchant' | 'amount' | 'date';
}

// Available export fields
export const EXPORT_FIELDS: ExportField[] = [
  {
    key: 'invoiceNumber',
    label: '發票號碼',
    getValue: (invoice) => invoice.invoiceNumber,
    category: 'invoice'
  },
  {
    key: 'invoiceDate',
    label: '發票日期',
    getValue: (invoice) => invoice.invoiceDate.toLocaleDateString('zh-TW'),
    category: 'date'
  },
  {
    key: 'merchantName',
    label: '商店名稱',
    getValue: (invoice) => invoice.merchantName,
    category: 'merchant'
  },
  {
    key: 'merchantId',
    label: '商店統編',
    getValue: (invoice) => invoice.merchantId,
    category: 'merchant'
  },
  {
    key: 'totalAmount',
    label: '總金額',
    getValue: (invoice) => invoice.totalAmount,
    category: 'amount'
  },
  {
    key: 'status',
    label: '狀態',
    getValue: (invoice) => invoice.status === 'issued' ? '開立' : '作廢',
    category: 'invoice'
  },
  {
    key: 'carrierType',
    label: '載具類型',
    getValue: (invoice) => invoice.carrierType,
    category: 'invoice'
  },
  {
    key: 'carrierNumber',
    label: '載具號碼',
    getValue: (invoice) => invoice.carrierNumber,
    category: 'invoice'
  },
  {
    key: 'itemCount',
    label: '品項數量',
    getValue: (invoice) => invoice.items.length,
    category: 'amount'
  }
];

// Default export fields
export const DEFAULT_EXPORT_FIELDS = [
  'invoiceNumber',
  'invoiceDate',
  'merchantName',
  'totalAmount',
  'status'
];

export interface ExportOptions {
  selectedFields: string[];
  includeItems: boolean;
  filename?: string;
}

/**
 * Export invoices to CSV format
 */
export async function exportInvoicesToCSV(
  invoices: Invoice[],
  options: ExportOptions,
  progressId?: string
): Promise<{ success: boolean; error?: string; filename?: string }> {
  try {
    const { selectedFields, includeItems, filename } = options;
    
    // Update progress if tracking
    if (progressId) {
      const { updateExportProgress } = await import('./exportProgressService');
      updateExportProgress(progressId, 'processing', 10, '驗證匯出選項...');
    }
    
    // Validate selected fields
    const validFields = EXPORT_FIELDS.filter(field => 
      selectedFields.includes(field.key)
    );
    
    if (validFields.length === 0) {
      return { success: false, error: '請至少選擇一個匯出欄位' };
    }

    if (progressId) {
      const { updateExportProgress } = await import('./exportProgressService');
      updateExportProgress(progressId, 'processing', 30, '準備資料...');
    }

    let csvData: any[] = [];
    
    if (includeItems) {
      // Export with item details (one row per item)
      csvData = generateItemDetailCSV(invoices, validFields);
    } else {
      // Export invoice summary (one row per invoice)
      csvData = generateInvoiceSummaryCSV(invoices, validFields);
    }

    if (progressId) {
      const { updateExportProgress } = await import('./exportProgressService');
      updateExportProgress(progressId, 'generating', 60, '生成 CSV 內容...');
    }

    // Generate CSV content
    const csv = Papa.unparse(csvData, {
      header: true
    });

    if (progressId) {
      const { updateExportProgress } = await import('./exportProgressService');
      updateExportProgress(progressId, 'generating', 90, '準備下載...');
    }

    // Create and download file
    const finalFilename = filename || generateDefaultFilename(includeItems);
    downloadCSV(csv, finalFilename);

    return { success: true, filename: finalFilename };
  } catch (error) {
    console.error('CSV export error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '匯出過程中發生未知錯誤' 
    };
  }
}

/**
 * Generate CSV data for invoice summary (one row per invoice)
 */
function generateInvoiceSummaryCSV(invoices: Invoice[], fields: ExportField[]): any[] {
  return invoices.map(invoice => {
    const row: any = {};
    fields.forEach(field => {
      row[field.label] = field.getValue(invoice);
    });
    return row;
  });
}

/**
 * Generate CSV data with item details (one row per item)
 */
function generateItemDetailCSV(invoices: Invoice[], fields: ExportField[]): any[] {
  const rows: any[] = [];
  
  invoices.forEach(invoice => {
    if (invoice.items.length === 0) {
      // If no items, create one row for the invoice
      const row: any = {};
      fields.forEach(field => {
        row[field.label] = field.getValue(invoice);
      });
      // Add empty item fields
      row['品項名稱'] = '';
      row['品項金額'] = '';
      row['品項分類'] = '';
      rows.push(row);
    } else {
      // Create one row per item
      invoice.items.forEach(item => {
        const row: any = {};
        fields.forEach(field => {
          row[field.label] = field.getValue(invoice);
        });
        // Add item fields
        row['品項名稱'] = item.itemName;
        row['品項金額'] = item.amount;
        row['品項分類'] = item.category || '';
        rows.push(row);
      });
    }
  });
  
  return rows;
}

/**
 * Generate default filename for export
 */
function generateDefaultFilename(includeItems: boolean): string {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '');
  const type = includeItems ? '明細' : '摘要';
  
  return `發票資料_${type}_${dateStr}_${timeStr}.csv`;
}

/**
 * Download CSV content as file
 */
function downloadCSV(csvContent: string, filename: string): void {
  // Add BOM for proper UTF-8 encoding in Excel
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { 
    type: 'text/csv;charset=utf-8;' 
  });
  
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL object
  URL.revokeObjectURL(url);
}

/**
 * Get export field categories for UI grouping
 */
export function getFieldCategories(): Record<string, ExportField[]> {
  const categories: Record<string, ExportField[]> = {
    invoice: [],
    merchant: [],
    amount: [],
    date: []
  };
  
  EXPORT_FIELDS.forEach(field => {
    categories[field.category].push(field);
  });
  
  return categories;
}

/**
 * Validate export options
 */
export function validateExportOptions(options: ExportOptions): { 
  isValid: boolean; 
  errors: string[] 
} {
  const errors: string[] = [];
  
  if (!options.selectedFields || options.selectedFields.length === 0) {
    errors.push('請至少選擇一個匯出欄位');
  }
  
  // Validate field keys
  const validFieldKeys = EXPORT_FIELDS.map(f => f.key);
  const invalidFields = options.selectedFields.filter(
    key => !validFieldKeys.includes(key)
  );
  
  if (invalidFields.length > 0) {
    errors.push(`無效的欄位: ${invalidFields.join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Estimate export file size
 */
export function estimateExportSize(
  invoiceCount: number, 
  itemCount: number, 
  options: ExportOptions
): { sizeKB: number; warning?: string } {
  const fieldCount = options.selectedFields.length;
  const avgFieldSize = 20; // Average bytes per field
  
  let rowCount: number;
  let fieldsPerRow: number;
  
  if (options.includeItems) {
    rowCount = itemCount || invoiceCount; // Fallback to invoice count if no items
    fieldsPerRow = fieldCount + 3; // Add item fields
  } else {
    rowCount = invoiceCount;
    fieldsPerRow = fieldCount;
  }
  
  const estimatedBytes = rowCount * fieldsPerRow * avgFieldSize;
  const sizeKB = Math.ceil(estimatedBytes / 1024);
  
  let warning: string | undefined;
  if (sizeKB > 10240) { // > 10MB
    warning = '檔案可能較大，匯出時間可能較長';
  } else if (sizeKB > 1024) { // > 1MB
    warning = '檔案較大，請耐心等待';
  }
  
  return { sizeKB, warning };
}