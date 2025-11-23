// Invoice data models
export interface Invoice {
  id: string;
  carrierType: string;
  carrierNumber: string;
  invoiceDate: Date;
  merchantId: string;
  merchantName: string;
  invoiceNumber: string;
  totalAmount: number;
  status: 'issued' | 'voided';
  items: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  amount: number;
  itemName: string;
  category?: string;
}

// Statistics data models
export interface Statistics {
  totalAmount: number;
  totalInvoices: number;
  averageAmount: number;
  dateRange: {
    start: Date;
    end: Date;
  };
  categoryBreakdown: CategoryStat[];
  timeSeriesData: TimeSeriesPoint[];
}

export interface CategoryStat {
  category: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface TimeSeriesPoint {
  date: Date;
  amount: number;
  count: number;
}

// File management data models
export interface FileInfo {
  id: string;
  fileName: string;
  uploadDate: Date;
  fileSize: number;
  status: 'processing' | 'completed' | 'error';
  invoiceCount: number;
  errorMessage?: string;
  originalFileData?: string; // Base64 encoded original file data for reprocessing
  lastProcessedDate?: Date; // Track when file was last processed
}

// Filter data models
export interface FilterCriteria {
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  merchantName: string;
  amountRange: {
    min: number | null;
    max: number | null;
  };
}

export interface FilteredData {
  invoices: Invoice[];
  statistics: Statistics;
}

// Personal Assets
export type AssetType =
  | 'cash'
  | 'bank'
  | 'stock'
  | 'crypto'
  | 'real_estate'
  | 'other';

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  value: number;
  currency: string; // e.g., 'TWD', 'USD'
  acquiredDate?: Date;
  notes?: string;
}
