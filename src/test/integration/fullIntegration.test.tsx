/**
 * Full Integration Test Suite
 * Tests complete application functionality and integration between all modules
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import App from '../../App';
import { useInvoiceStore } from '../../store';

// Mock file for testing
const createMockFile = (name: string, content: string) => {
  const blob = new Blob([content], { type: 'text/csv' });
  return new File([blob], name, { type: 'text/csv' });
};

const sampleCSVContent = `M,11201,/ABCDEFG,2024-01-15,12345678,測試商店,AB12345678,100,0
D,AB12345678,50,測試商品A
D,AB12345678,50,測試商品B
M,11201,/ABCDEFG,2024-01-16,12345678,測試商店,AB12345679,200,0
D,AB12345679,200,測試商品C`;

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('Full Application Integration Tests', () => {
  beforeEach(() => {
    // Clear store state before each test
    useInvoiceStore.getState().clearAllData();
    
    // Clear localStorage
    localStorage.clear();
    
    // Mock URL.createObjectURL for file downloads
    global.URL.createObjectURL = vi.fn(() => 'mock-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  it('should complete full user workflow from file upload to data export', async () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    // Step 1: Verify initial dashboard state
    expect(screen.getByText('發票整理儀表板')).toBeInTheDocument();
    expect(screen.getByText('總消費金額')).toBeInTheDocument();
    expect(screen.getByText('$0')).toBeInTheDocument();

    // Step 2: Navigate to file manager
    fireEvent.click(screen.getByText('檔案管理'));
    await waitFor(() => {
      expect(screen.getByText('檔案管理')).toBeInTheDocument();
    });

    // Step 3: Upload CSV file
    const file = createMockFile('test-invoices.csv', sampleCSVContent);
    const fileInput = screen.getByRole('button', { name: /選擇檔案/ });
    
    // Simulate file selection
    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (hiddenInput) {
      Object.defineProperty(hiddenInput, 'files', {
        value: [file],
        writable: false,
      });
      fireEvent.change(hiddenInput);
    }

    // Wait for file processing
    await waitFor(() => {
      expect(screen.getByText(/處理完成|已處理/)).toBeInTheDocument();
    }, { timeout: 5000 });

    // Step 4: Verify file appears in list
    expect(screen.getByText('test-invoices.csv')).toBeInTheDocument();

    // Step 5: Navigate back to dashboard and verify statistics
    fireEvent.click(screen.getByText('儀表板'));
    await waitFor(() => {
      expect(screen.getByText('發票整理儀表板')).toBeInTheDocument();
    });

    // Verify statistics are updated
    await waitFor(() => {
      const totalAmountElements = screen.getAllByText(/\$[1-9]/);
      expect(totalAmountElements.length).toBeGreaterThan(0);
    });

    // Step 6: Navigate to analytics page
    fireEvent.click(screen.getByText('詳細分析'));
    await waitFor(() => {
      expect(screen.getByText('詳細分析')).toBeInTheDocument();
    });

    // Step 7: Test filtering functionality
    const dateFilter = screen.getByDisplayValue('2024-01-01');
    fireEvent.change(dateFilter, { target: { value: '2024-01-15' } });

    // Apply filter
    const applyButton = screen.getByRole('button', { name: /套用篩選/ });
    fireEvent.click(applyButton);

    // Verify filtered results
    await waitFor(() => {
      expect(screen.getByText(/篩選結果/)).toBeInTheDocument();
    });

    // Step 8: Test export functionality
    const exportButton = screen.getByRole('button', { name: /匯出/ });
    fireEvent.click(exportButton);

    // Test CSV export
    const csvExportButton = screen.getByText('匯出 CSV');
    fireEvent.click(csvExportButton);

    // Verify export was triggered
    await waitFor(() => {
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });
  });

  it('should handle error states gracefully', async () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    // Navigate to file manager
    fireEvent.click(screen.getByText('檔案管理'));

    // Try to upload invalid file
    const invalidFile = createMockFile('invalid.txt', 'invalid content');
    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    if (hiddenInput) {
      Object.defineProperty(hiddenInput, 'files', {
        value: [invalidFile],
        writable: false,
      });
      fireEvent.change(hiddenInput);
    }

    // Verify error message is shown
    await waitFor(() => {
      expect(screen.getByText(/請選擇CSV格式的檔案/)).toBeInTheDocument();
    });
  });

  it('should maintain data persistence across navigation', async () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    // Upload file and verify data
    fireEvent.click(screen.getByText('檔案管理'));
    
    const file = createMockFile('persistence-test.csv', sampleCSVContent);
    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    if (hiddenInput) {
      Object.defineProperty(hiddenInput, 'files', {
        value: [file],
        writable: false,
      });
      fireEvent.change(hiddenInput);
    }

    await waitFor(() => {
      expect(screen.getByText(/處理完成|已處理/)).toBeInTheDocument();
    }, { timeout: 5000 });

    // Navigate to dashboard
    fireEvent.click(screen.getByText('儀表板'));
    
    // Get current statistics
    await waitFor(() => {
      const totalAmountElements = screen.getAllByText(/\$[1-9]/);
      expect(totalAmountElements.length).toBeGreaterThan(0);
    });

    // Navigate to analytics and back
    fireEvent.click(screen.getByText('詳細分析'));
    fireEvent.click(screen.getByText('儀表板'));

    // Verify data persists
    await waitFor(() => {
      const totalAmountElements = screen.getAllByText(/\$[1-9]/);
      expect(totalAmountElements.length).toBeGreaterThan(0);
    });
  });

  it('should handle large datasets efficiently', async () => {
    // Generate large CSV content
    let largeCSVContent = '';
    for (let i = 0; i < 100; i++) {
      largeCSVContent += `M,11201,/ABCDEFG,2024-01-${String(i % 28 + 1).padStart(2, '0')},12345678,測試商店${i},AB${String(i).padStart(8, '0')},${100 + i},0\n`;
      largeCSVContent += `D,AB${String(i).padStart(8, '0')},${50 + i},測試商品${i}A\n`;
      largeCSVContent += `D,AB${String(i).padStart(8, '0')},${50},測試商品${i}B\n`;
    }

    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    // Upload large file
    fireEvent.click(screen.getByText('檔案管理'));
    
    const largeFile = createMockFile('large-dataset.csv', largeCSVContent);
    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    if (hiddenInput) {
      Object.defineProperty(hiddenInput, 'files', {
        value: [largeFile],
        writable: false,
      });
      fireEvent.change(hiddenInput);
    }

    // Verify processing completes within reasonable time
    const startTime = Date.now();
    await waitFor(() => {
      expect(screen.getByText(/處理完成|已處理/)).toBeInTheDocument();
    }, { timeout: 10000 });
    
    const processingTime = Date.now() - startTime;
    expect(processingTime).toBeLessThan(8000); // Should complete within 8 seconds

    // Navigate to dashboard and verify performance
    const dashboardStartTime = Date.now();
    fireEvent.click(screen.getByText('儀表板'));
    
    await waitFor(() => {
      const totalAmountElements = screen.getAllByText(/\$[1-9]/);
      expect(totalAmountElements.length).toBeGreaterThan(0);
    });
    
    const dashboardLoadTime = Date.now() - dashboardStartTime;
    expect(dashboardLoadTime).toBeLessThan(3000); // Dashboard should load within 3 seconds
  });

  it('should support accessibility features', async () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    // Check for proper heading structure
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();

    // Check for proper button labels
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toHaveAccessibleName();
    });

    // Check for proper navigation
    const navigation = screen.getByRole('navigation');
    expect(navigation).toBeInTheDocument();

    // Test keyboard navigation
    const firstButton = buttons[0];
    firstButton.focus();
    expect(document.activeElement).toBe(firstButton);
  });

  it('should handle concurrent operations correctly', async () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('檔案管理'));

    // Upload multiple files simultaneously
    const file1 = createMockFile('concurrent1.csv', sampleCSVContent);
    const file2 = createMockFile('concurrent2.csv', sampleCSVContent);
    
    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    if (hiddenInput) {
      Object.defineProperty(hiddenInput, 'files', {
        value: [file1, file2],
        writable: false,
      });
      fireEvent.change(hiddenInput);
    }

    // Verify both files are processed
    await waitFor(() => {
      expect(screen.getByText('concurrent1.csv')).toBeInTheDocument();
      expect(screen.getByText('concurrent2.csv')).toBeInTheDocument();
    }, { timeout: 10000 });

    // Navigate to dashboard and verify combined statistics
    fireEvent.click(screen.getByText('儀表板'));
    
    await waitFor(() => {
      const totalAmountElements = screen.getAllByText(/\$[1-9]/);
      expect(totalAmountElements.length).toBeGreaterThan(0);
    });
  });
});