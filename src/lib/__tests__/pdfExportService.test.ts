import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Invoice, Statistics } from '@/types';
import {
  exportStatisticsToPDF,
  validatePDFExportOptions,
  estimatePDFGenerationTime,
  captureChartElement,
  captureChartElements
} from '../pdfExportService';

// Mock jsPDF
const mockSave = vi.fn();
const mockAddPage = vi.fn();
const mockSetFontSize = vi.fn();
const mockText = vi.fn();
const mockLine = vi.fn();
const mockAddImage = vi.fn();

vi.mock('jspdf', () => ({
  default: vi.fn().mockImplementation(() => ({
    save: mockSave,
    addPage: mockAddPage,
    setFontSize: mockSetFontSize,
    text: mockText,
    line: mockLine,
    addImage: mockAddImage
  }))
}));

// Mock html2canvas
vi.mock('html2canvas', () => ({
  default: vi.fn().mockResolvedValue({
    toDataURL: vi.fn().mockReturnValue('data:image/png;base64,mock-image-data'),
    width: 800,
    height: 600
  })
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  format: vi.fn((date, formatStr) => {
    if (formatStr.includes('yyyy年MM月dd日')) {
      return '2024年01月15日 10:30';
    }
    if (formatStr.includes('yyyy/MM/dd')) {
      return '2024/01/15';
    }
    if (formatStr.includes('MM/dd')) {
      return '01/15';
    }
    if (formatStr.includes('yyyy-MM-dd_HHmm')) {
      return '2024-01-15_1030';
    }
    return '2024-01-15';
  })
}));

vi.mock('date-fns/locale', () => ({
  zhTW: {}
}));

describe('pdfExportService', () => {
  const mockStatistics: Statistics = {
    totalAmount: 1000,
    totalInvoices: 5,
    averageAmount: 200,
    dateRange: {
      start: new Date('2024-01-01'),
      end: new Date('2024-01-31')
    },
    categoryBreakdown: [
      { category: '食品', amount: 500, count: 3, percentage: 50 },
      { category: '飲料', amount: 300, count: 1, percentage: 30 },
      { category: '日用品', amount: 200, count: 1, percentage: 20 }
    ],
    timeSeriesData: []
  };

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
      items: []
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
      items: []
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validatePDFExportOptions', () => {
    it('should validate valid options', () => {
      const result = validatePDFExportOptions({
        title: '測試報告',
        includeCharts: true,
        includeDetailedData: false,
        filename: 'test-report.pdf'
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty filename', () => {
      const result = validatePDFExportOptions({
        filename: '   '
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('檔案名稱不能為空');
    });

    it('should reject invalid filename characters', () => {
      const result = validatePDFExportOptions({
        filename: 'test<>file.pdf'
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('無效字元'))).toBe(true);
    });

    it('should validate chart elements', () => {
      const mockElement = document.createElement('div');
      const invalidElement = {} as HTMLElement;

      const result = validatePDFExportOptions({
        includeCharts: true,
        chartElements: [mockElement, invalidElement]
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('圖表元素無效'))).toBe(true);
    });
  });

  describe('estimatePDFGenerationTime', () => {
    it('should estimate time for basic report', () => {
      const result = estimatePDFGenerationTime(10, 0, false);

      expect(result.estimatedSeconds).toBeGreaterThan(0);
      expect(result.warning).toBeUndefined();
    });

    it('should estimate time with charts', () => {
      const result = estimatePDFGenerationTime(10, 3, false);

      expect(result.estimatedSeconds).toBeGreaterThan(2);
    });

    it('should estimate time with detailed data', () => {
      const result = estimatePDFGenerationTime(1000, 0, true);

      expect(result.estimatedSeconds).toBeGreaterThan(2);
    });

    it('should provide warning for long generation time', () => {
      const result = estimatePDFGenerationTime(1000, 5, true);

      expect(result.warning).toBeDefined();
    });

    it('should provide warning for many charts', () => {
      const result = estimatePDFGenerationTime(10, 5, false);

      expect(result.warning).toBeDefined();
    });
  });

  describe('exportStatisticsToPDF', () => {
    it('should export basic PDF successfully', async () => {
      const result = await exportStatisticsToPDF(mockStatistics, mockInvoices, {
        title: '測試報告',
        filename: 'test.pdf'
      });

      expect(result.success).toBe(true);
      expect(result.filename).toBe('test.pdf');
      expect(mockSave).toHaveBeenCalledWith('test.pdf');
    });

    it('should export PDF with default filename', async () => {
      const result = await exportStatisticsToPDF(mockStatistics, mockInvoices);

      expect(result.success).toBe(true);
      expect(result.filename).toContain('發票統計報告_');
      expect(mockSave).toHaveBeenCalled();
    });

    it('should export PDF with charts', async () => {
      const mockElement = document.createElement('canvas');
      
      const result = await exportStatisticsToPDF(mockStatistics, mockInvoices, {
        includeCharts: true,
        chartElements: [mockElement]
      });

      expect(result.success).toBe(true);
      expect(mockAddImage).toHaveBeenCalled();
    });

    it('should export PDF with detailed data', async () => {
      const result = await exportStatisticsToPDF(mockStatistics, mockInvoices, {
        includeDetailedData: true
      });

      expect(result.success).toBe(true);
      // Should call text method multiple times for table data
      expect(mockText).toHaveBeenCalled();
      expect(mockText.mock.calls.length).toBeGreaterThan(10);
    });

    it('should handle export errors gracefully', async () => {
      // Mock jsPDF to throw an error
      mockSave.mockImplementationOnce(() => {
        throw new Error('PDF generation failed');
      });

      const result = await exportStatisticsToPDF(mockStatistics, mockInvoices);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle chart capture errors gracefully', async () => {
      // Mock html2canvas to reject
      const html2canvas = await import('html2canvas');
      const originalDefault = html2canvas.default;
      html2canvas.default = vi.fn().mockRejectedValue(new Error('Canvas error'));

      const mockElement = document.createElement('div');
      const result = await exportStatisticsToPDF(mockStatistics, mockInvoices, {
        includeCharts: true,
        chartElements: [mockElement]
      });

      expect(result.success).toBe(true); // Should still succeed
      expect(mockText).toHaveBeenCalledWith('圖表擷取失敗', expect.any(Number), expect.any(Number));

      // Restore original function
      html2canvas.default = originalDefault;
    });
  });

  describe('captureChartElement', () => {
    it('should capture existing element', () => {
      // Create a test element
      const testElement = document.createElement('div');
      testElement.id = 'test-chart';
      document.body.appendChild(testElement);

      const result = captureChartElement('#test-chart');

      expect(result).toBe(testElement);

      // Clean up
      document.body.removeChild(testElement);
    });

    it('should return null for non-existing element', () => {
      const result = captureChartElement('#non-existing-chart');

      expect(result).toBeNull();
    });
  });

  describe('captureChartElements', () => {
    it('should capture multiple existing elements', () => {
      // Create test elements
      const element1 = document.createElement('div');
      element1.className = 'chart-1';
      const element2 = document.createElement('div');
      element2.className = 'chart-2';
      
      document.body.appendChild(element1);
      document.body.appendChild(element2);

      const result = captureChartElements(['.chart-1', '.chart-2']);

      expect(result).toHaveLength(2);
      expect(result[0]).toBe(element1);
      expect(result[1]).toBe(element2);

      // Clean up
      document.body.removeChild(element1);
      document.body.removeChild(element2);
    });

    it('should skip non-existing elements', () => {
      const element1 = document.createElement('div');
      element1.className = 'existing-chart';
      document.body.appendChild(element1);

      const result = captureChartElements(['.existing-chart', '.non-existing-chart']);

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(element1);

      // Clean up
      document.body.removeChild(element1);
    });

    it('should return empty array for no existing elements', () => {
      const result = captureChartElements(['.non-existing-1', '.non-existing-2']);

      expect(result).toHaveLength(0);
    });
  });
});