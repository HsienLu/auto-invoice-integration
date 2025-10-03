/**
 * Integration Tests for File Upload Flow
 * Tests the complete file upload, parsing, and data integration process
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import FileManager from '@/pages/FileManager';
import { useInvoiceStore } from '@/store';
import { parseInvoiceCSV } from '@/lib/csvParser';

// Mock the CSV parser
vi.mock('@/lib/csvParser', () => ({
  parseInvoiceCSV: vi.fn(),
  validateCSVFile: vi.fn(),
  createFileInfo: vi.fn(),
}));

// Mock file for testing
const createMockFile = (name: string, content: string, type: string = 'text/csv') => {
  const blob = new Blob([content], { type });
  const file = new File([blob], name, { type });
  return file;
};

// Sample CSV content
const sampleCSVContent = `M,載具類型,載具號碼,2024/01/15,12345678,測試商店,AB12345678,150,issued
D,AB12345678,測試商品,150
M,載具類型,載具號碼,2024/01/16,87654321,另一商店,CD87654321,200,issued
D,CD87654321,另一商品,200`;

// Wrapper component for testing
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('File Upload Integration Tests', () => {
  beforeEach(() => {
    // Reset store state
    useInvoiceStore.getState().clearData();
    vi.clearAllMocks();
  });

  it('should handle complete file upload flow successfully', async () => {
    // Mock successful parsing
    const mockParseResult = {
      success: true,
      invoices: [
        {
          id: 'test-1',
          carrierType: '載具類型',
          carrierNumber: '載具號碼',
          invoiceDate: new Date('2024-01-15'),
          merchantId: '12345678',
          merchantName: '測試商店',
          invoiceNumber: 'AB12345678',
          totalAmount: 150,
          status: 'issued' as const,
          items: [
            {
              id: 'item-1',
              invoiceNumber: 'AB12345678',
              itemName: '測試商品',
              amount: 150,
              category: '其他',
            },
          ],
        },
        {
          id: 'test-2',
          carrierType: '載具類型',
          carrierNumber: '載具號碼',
          invoiceDate: new Date('2024-01-16'),
          merchantId: '87654321',
          merchantName: '另一商店',
          invoiceNumber: 'CD87654321',
          totalAmount: 200,
          status: 'issued' as const,
          items: [
            {
              id: 'item-2',
              invoiceNumber: 'CD87654321',
              itemName: '另一商品',
              amount: 200,
              category: '其他',
            },
          ],
        },
      ],
      errors: [],
      totalRows: 4,
      processedRows: 2,
    };

    vi.mocked(parseInvoiceCSV).mockResolvedValue(mockParseResult);

    // Render FileManager
    render(
      <TestWrapper>
        <FileManager />
      </TestWrapper>
    );

    // Check initial state
    expect(screen.getByText('檔案管理')).toBeInTheDocument();
    expect(screen.getByText('拖放檔案到此處或點擊選擇檔案')).toBeInTheDocument();

    // Create and upload file
    const file = createMockFile('test-invoices.csv', sampleCSVContent);
    const fileInput = screen.getByLabelText(/選擇檔案/i);

    // Simulate file selection
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Wait for file processing
    await waitFor(() => {
      expect(parseInvoiceCSV).toHaveBeenCalledWith(file, expect.any(Object));
    });

    // Check that invoices were added to store
    await waitFor(() => {
      const state = useInvoiceStore.getState();
      expect(state.invoices).toHaveLength(2);
      expect(state.files).toHaveLength(1);
      expect(state.statistics).toBeTruthy();
    });

    // Verify statistics calculation
    const state = useInvoiceStore.getState();
    expect(state.statistics?.totalAmount).toBe(350);
    expect(state.statistics?.totalInvoices).toBe(2);
    expect(state.statistics?.averageAmount).toBe(175);
  });

  it('should handle file upload with parsing errors', async () => {
    // Mock parsing with errors
    const mockParseResult = {
      success: false,
      invoices: [],
      errors: [
        {
          row: 1,
          message: '無效的日期格式',
          data: ['M', '載具類型', '載具號碼', 'invalid-date'],
        },
      ],
      totalRows: 1,
      processedRows: 0,
    };

    vi.mocked(parseInvoiceCSV).mockResolvedValue(mockParseResult);

    render(
      <TestWrapper>
        <FileManager />
      </TestWrapper>
    );

    const file = createMockFile('invalid-invoices.csv', 'M,載具類型,載具號碼,invalid-date');
    const fileInput = screen.getByLabelText(/選擇檔案/i);

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(parseInvoiceCSV).toHaveBeenCalled();
    });

    // Check error handling
    await waitFor(() => {
      const state = useInvoiceStore.getState();
      expect(state.invoices).toHaveLength(0);
      expect(state.files).toHaveLength(1);
      expect(state.files[0].status).toBe('error');
    });
  });

  it('should handle multiple file uploads', async () => {
    // Mock successful parsing for multiple files
    const mockParseResult1 = {
      success: true,
      invoices: [
        {
          id: 'test-1',
          carrierType: '載具類型',
          carrierNumber: '載具號碼',
          invoiceDate: new Date('2024-01-15'),
          merchantId: '12345678',
          merchantName: '測試商店',
          invoiceNumber: 'AB12345678',
          totalAmount: 150,
          status: 'issued' as const,
          items: [],
        },
      ],
      errors: [],
      totalRows: 1,
      processedRows: 1,
    };

    const mockParseResult2 = {
      success: true,
      invoices: [
        {
          id: 'test-2',
          carrierType: '載具類型',
          carrierNumber: '載具號碼',
          invoiceDate: new Date('2024-01-16'),
          merchantId: '87654321',
          merchantName: '另一商店',
          invoiceNumber: 'CD87654321',
          totalAmount: 200,
          status: 'issued' as const,
          items: [],
        },
      ],
      errors: [],
      totalRows: 1,
      processedRows: 1,
    };

    vi.mocked(parseInvoiceCSV)
      .mockResolvedValueOnce(mockParseResult1)
      .mockResolvedValueOnce(mockParseResult2);

    render(
      <TestWrapper>
        <FileManager />
      </TestWrapper>
    );

    const fileInput = screen.getByLabelText(/選擇檔案/i);

    // Upload first file
    const file1 = createMockFile('invoices1.csv', sampleCSVContent);
    fireEvent.change(fileInput, { target: { files: [file1] } });

    await waitFor(() => {
      const state = useInvoiceStore.getState();
      expect(state.invoices).toHaveLength(1);
      expect(state.files).toHaveLength(1);
    });

    // Upload second file
    const file2 = createMockFile('invoices2.csv', sampleCSVContent);
    fireEvent.change(fileInput, { target: { files: [file2] } });

    await waitFor(() => {
      const state = useInvoiceStore.getState();
      expect(state.invoices).toHaveLength(2);
      expect(state.files).toHaveLength(2);
    });

    // Verify combined statistics
    const state = useInvoiceStore.getState();
    expect(state.statistics?.totalAmount).toBe(350);
    expect(state.statistics?.totalInvoices).toBe(2);
  });

  it('should handle file deletion and update statistics', async () => {
    // Setup initial data
    const mockParseResult = {
      success: true,
      invoices: [
        {
          id: 'test-1',
          carrierType: '載具類型',
          carrierNumber: '載具號碼',
          invoiceDate: new Date('2024-01-15'),
          merchantId: '12345678',
          merchantName: '測試商店',
          invoiceNumber: 'AB12345678',
          totalAmount: 150,
          status: 'issued' as const,
          items: [],
        },
      ],
      errors: [],
      totalRows: 1,
      processedRows: 1,
    };

    vi.mocked(parseInvoiceCSV).mockResolvedValue(mockParseResult);

    render(
      <TestWrapper>
        <FileManager />
      </TestWrapper>
    );

    // Upload file
    const file = createMockFile('test.csv', sampleCSVContent);
    const fileInput = screen.getByLabelText(/選擇檔案/i);
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      const state = useInvoiceStore.getState();
      expect(state.files).toHaveLength(1);
    });

    // Get file ID for deletion
    const state = useInvoiceStore.getState();
    const fileId = state.files[0].id;

    // Delete file
    useInvoiceStore.getState().removeFile(fileId);

    // Verify file and data removal
    const updatedState = useInvoiceStore.getState();
    expect(updatedState.files).toHaveLength(0);
    expect(updatedState.invoices).toHaveLength(0);
    expect(updatedState.statistics?.totalAmount).toBe(0);
  });

  it('should show progress during file processing', async () => {
    let progressCallback: ((progress: number, message: string) => void) | undefined;

    // Mock parseInvoiceCSV to capture progress callback
    vi.mocked(parseInvoiceCSV).mockImplementation(async (file, options) => {
      progressCallback = options?.onProgress;
      
      // Simulate progress updates
      if (progressCallback) {
        progressCallback(25, '解析中...');
        await new Promise(resolve => setTimeout(resolve, 100));
        progressCallback(50, '處理資料...');
        await new Promise(resolve => setTimeout(resolve, 100));
        progressCallback(75, '整合資料...');
        await new Promise(resolve => setTimeout(resolve, 100));
        progressCallback(100, '完成');
      }

      return {
        success: true,
        invoices: [],
        errors: [],
        totalRows: 0,
        processedRows: 0,
      };
    });

    render(
      <TestWrapper>
        <FileManager />
      </TestWrapper>
    );

    const file = createMockFile('test.csv', sampleCSVContent);
    const fileInput = screen.getByLabelText(/選擇檔案/i);

    fireEvent.change(fileInput, { target: { files: [file] } });

    // Verify progress callback was called
    await waitFor(() => {
      expect(progressCallback).toBeDefined();
    });
  });
});