import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Invoice, InvoiceItem } from '@/types';
import {
  exportInvoicesToCSV,
  validateExportOptions,
  estimateExportSize,
  EXPORT_FIELDS,
  DEFAULT_EXPORT_FIELDS,
  getFieldCategories
} from '../exportService';

// Mock Papa.unparse
vi.mock('papaparse', () => ({
  default: {
    unparse: vi.fn((data) => {
      // Simple CSV mock - just return stringified data
      if (Array.isArray(data) && data.length > 0) {
        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(row => Object.values(row).join(','));
        return [headers, ...rows].join('\n');
      }
      return '';
    })
  }
}));

// Mock DOM methods
Object.defineProperty(global, 'URL', {
  value: {
    createObjectURL: vi.fn(() => 'mock-url'),
    revokeObjectURL: vi.fn()
  }
});

Object.defineProperty(global, 'Blob', {
  value: class MockBlob {
    constructor(content: any[], options: any) {
      this.content = content;
      this.options = options;
    }
    content: any[];
    options: any;
  }
});

// Mock document methods
Object.defineProperty(global.document, 'createElement', {
  value: vi.fn(() => ({
    setAttribute: vi.fn(),
    click: vi.fn(),
    style: {}
  }))
});

Object.defineProperty(global.document, 'body', {
  value: {
    appendChild: vi.fn(),
    removeChild: vi.fn()
  }
});

describe('exportService', () => {
  const mockInvoices: Invoice[] = [
    {
      id: '1',
      carrierType: '手機條碼',
      carrierNumber: '/ABC123',
      invoiceDate: new Date('2024-01-15'),
      merchantId: '12345678',
      merchantName: '測試商店',
      invoiceNumber: 'AB12345678',
      totalAmount: 100,
      status: 'issued',
      items: [
        {
          id: '1-1',
          invoiceNumber: 'AB12345678',
          amount: 50,
          itemName: '商品A',
          category: '食品'
        },
        {
          id: '1-2',
          invoiceNumber: 'AB12345678',
          amount: 50,
          itemName: '商品B',
          category: '飲料'
        }
      ]
    },
    {
      id: '2',
      carrierType: '悠遊卡',
      carrierNumber: '1234567890123456',
      invoiceDate: new Date('2024-01-16'),
      merchantId: '87654321',
      merchantName: '另一個商店',
      invoiceNumber: 'CD87654321',
      totalAmount: 200,
      status: 'issued',
      items: [
        {
          id: '2-1',
          invoiceNumber: 'CD87654321',
          amount: 200,
          itemName: '商品C',
          category: '日用品'
        }
      ]
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateExportOptions', () => {
    it('should validate valid options', () => {
      const result = validateExportOptions({
        selectedFields: ['invoiceNumber', 'totalAmount'],
        includeItems: false
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty field selection', () => {
      const result = validateExportOptions({
        selectedFields: [],
        includeItems: false
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('請至少選擇一個匯出欄位');
    });

    it('should reject invalid field keys', () => {
      const result = validateExportOptions({
        selectedFields: ['invalidField'],
        includeItems: false
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('無效的欄位'))).toBe(true);
    });
  });

  describe('estimateExportSize', () => {
    it('should estimate size for invoice summary export', () => {
      const result = estimateExportSize(100, 300, {
        selectedFields: ['invoiceNumber', 'totalAmount'],
        includeItems: false
      });

      expect(result.sizeKB).toBeGreaterThan(0);
      expect(result.warning).toBeUndefined();
    });

    it('should estimate size for item detail export', () => {
      const result = estimateExportSize(100, 300, {
        selectedFields: ['invoiceNumber', 'totalAmount'],
        includeItems: true
      });

      expect(result.sizeKB).toBeGreaterThan(0);
    });

    it('should provide warning for large files', () => {
      const result = estimateExportSize(10000, 50000, {
        selectedFields: DEFAULT_EXPORT_FIELDS,
        includeItems: true
      });

      expect(result.warning).toBeDefined();
    });
  });

  describe('exportInvoicesToCSV', () => {
    it('should export invoice summary successfully', async () => {
      const result = await exportInvoicesToCSV(mockInvoices, {
        selectedFields: ['invoiceNumber', 'merchantName', 'totalAmount'],
        includeItems: false,
        filename: 'test-export.csv'
      });

      expect(result.success).toBe(true);
      expect(result.filename).toBe('test-export.csv');
    });

    it('should export with item details successfully', async () => {
      const result = await exportInvoicesToCSV(mockInvoices, {
        selectedFields: ['invoiceNumber', 'merchantName', 'totalAmount'],
        includeItems: true
      });

      expect(result.success).toBe(true);
      expect(result.filename).toBeDefined();
    });

    it('should handle empty field selection', async () => {
      const result = await exportInvoicesToCSV(mockInvoices, {
        selectedFields: [],
        includeItems: false
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('請至少選擇一個匯出欄位');
    });

    it('should handle export errors gracefully', async () => {
      // Mock Papa.unparse to throw an error
      const Papa = await import('papaparse');
      const originalUnparse = Papa.default.unparse;
      Papa.default.unparse = vi.fn(() => {
        throw new Error('Parse error');
      });

      const result = await exportInvoicesToCSV(mockInvoices, {
        selectedFields: ['invoiceNumber'],
        includeItems: false
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      // Restore original function
      Papa.default.unparse = originalUnparse;
    });
  });

  describe('getFieldCategories', () => {
    it('should return categorized fields', () => {
      const categories = getFieldCategories();

      expect(categories).toHaveProperty('invoice');
      expect(categories).toHaveProperty('merchant');
      expect(categories).toHaveProperty('amount');
      expect(categories).toHaveProperty('date');

      // Check that all fields are categorized
      const totalFields = Object.values(categories).flat().length;
      expect(totalFields).toBe(EXPORT_FIELDS.length);
    });

    it('should have valid field structures', () => {
      const categories = getFieldCategories();
      
      Object.values(categories).flat().forEach(field => {
        expect(field).toHaveProperty('key');
        expect(field).toHaveProperty('label');
        expect(field).toHaveProperty('getValue');
        expect(field).toHaveProperty('category');
        expect(typeof field.getValue).toBe('function');
      });
    });
  });

  describe('EXPORT_FIELDS', () => {
    it('should have valid field definitions', () => {
      EXPORT_FIELDS.forEach(field => {
        expect(field.key).toBeTruthy();
        expect(field.label).toBeTruthy();
        expect(typeof field.getValue).toBe('function');
        expect(['invoice', 'merchant', 'amount', 'date']).toContain(field.category);
      });
    });

    it('should extract values correctly from invoice data', () => {
      const testInvoice = mockInvoices[0];
      
      EXPORT_FIELDS.forEach(field => {
        const value = field.getValue(testInvoice);
        expect(value).toBeDefined();
      });
    });
  });

  describe('DEFAULT_EXPORT_FIELDS', () => {
    it('should contain valid field keys', () => {
      const validKeys = EXPORT_FIELDS.map(f => f.key);
      
      DEFAULT_EXPORT_FIELDS.forEach(key => {
        expect(validKeys).toContain(key);
      });
    });

    it('should not be empty', () => {
      expect(DEFAULT_EXPORT_FIELDS.length).toBeGreaterThan(0);
    });
  });
});