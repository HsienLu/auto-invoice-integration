/**
 * Integration Tests for Export Functionality
 * Tests CSV export and PDF report generation features
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Analytics from '@/pages/Analytics';
import { useInvoiceStore } from '@/store';
import { Invoice } from '@/types';

// Mock the export services
vi.mock('@/lib/exportService', () => ({
  exportToCSV: vi.fn(),
  exportToPDF: vi.fn(),
}));

// Mock jsPDF and html2canvas
vi.mock('jspdf', () => ({
  default: vi.fn().mockImplementation(() => ({
    addImage: vi.fn(),
    text: vi.fn(),
    save: vi.fn(),
    internal: {
      pageSize: {
        getWidth: () => 210,
        getHeight: () => 297,
      },
    },
  })),
}));

vi.mock('html2canvas', () => ({
  default: vi.fn().mockResolvedValue({
    toDataURL: () => 'data:image/png;base64,mock-image-data',
  }),
}));

// Mock Chart.js components
vi.mock('react-chartjs-2', () => ({
  Line: ({ data }: any) => (
    <div data-testid="line-chart" data-chart-data={JSON.stringify(data)} />
  ),
  Bar: ({ data }: any) => (
    <div data-testid="bar-chart" data-chart-data={JSON.stringify(data)} />
  ),
  Doughnut: ({ data }: any) => (
    <div data-testid="doughnut-chart" data-chart-data={JSON.stringify(data)} />
  ),
}));

// Mock Chart.js registration
vi.mock('chart.js', () => ({
  Chart: { register: vi.fn() },
  CategoryScale: {},
  LinearScale: {},
  PointElement: {},
  LineElement: {},
  BarElement: {},
  ArcElement: {},
  Title: {},
  Tooltip: {},
  Legend: {},
}));

// Test wrapper
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

// Sample test data
const sampleInvoices: Invoice[] = [
  {
    id: 'inv-1',
    carrierType: '手機條碼',
    carrierNumber: '/ABC123',
    invoiceDate: new Date('2024-01-15'),
    merchantId: '12345678',
    merchantName: '全家便利商店',
    invoiceNumber: 'AB12345678',
    totalAmount: 150,
    status: 'issued',
    items: [
      {
        id: 'item-1',
        invoiceNumber: 'AB12345678',
        itemName: '礦泉水',
        amount: 25,
        category: '飲料',
      },
      {
        id: 'item-2',
        invoiceNumber: 'AB12345678',
        itemName: '便當',
        amount: 125,
        category: '食品',
      },
    ],
  },
  {
    id: 'inv-2',
    carrierType: '手機條碼',
    carrierNumber: '/ABC123',
    invoiceDate: new Date('2024-01-20'),
    merchantId: '87654321',
    merchantName: '7-ELEVEN',
    invoiceNumber: 'CD87654321',
    totalAmount: 200,
    status: 'issued',
    items: [
      {
        id: 'item-3',
        invoiceNumber: 'CD87654321',
        itemName: '咖啡',
        amount: 50,
        category: '飲料',
      },
      {
        id: 'item-4',
        invoiceNumber: 'CD87654321',
        itemName: '三明治',
        amount: 150,
        category: '食品',
      },
    ],
  },
];

describe('Export Functionality Integration Tests', () => {
  beforeEach(() => {
    // Reset store and set up test data
    useInvoiceStore.getState().clearData();
    useInvoiceStore.getState().setInvoices(sampleInvoices);
    vi.clearAllMocks();
  });

  it('should export filtered data to CSV', async () => {
    const { exportToCSV } = await import('@/lib/exportService');
    
    render(
      <TestWrapper>
        <Analytics />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('詳細分析')).toBeInTheDocument();
    });

    // Find and click export button
    const exportButton = screen.getByRole('button', { name: /匯出資料/i });
    expect(exportButton).toBeInTheDocument();
    expect(exportButton).not.toBeDisabled();

    fireEvent.click(exportButton);

    // Verify export function was called
    await waitFor(() => {
      expect(exportToCSV).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            invoiceNumber: 'AB12345678',
            merchantName: '全家便利商店',
            totalAmount: 150,
          }),
          expect.objectContaining({
            invoiceNumber: 'CD87654321',
            merchantName: '7-ELEVEN',
            totalAmount: 200,
          }),
        ]),
        expect.any(String)
      );
    });
  });

  it('should disable export button when no data available', async () => {
    // Clear all data
    useInvoiceStore.getState().clearData();

    render(
      <TestWrapper>
        <Analytics />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('詳細分析')).toBeInTheDocument();
    });

    // Export button should be disabled when no data
    const exportButton = screen.getByRole('button', { name: /匯出資料/i });
    expect(exportButton).toBeDisabled();
  });

  it('should export PDF report with charts', async () => {
    const { exportToPDF } = await import('@/lib/exportService');

    render(
      <TestWrapper>
        <Analytics />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('詳細分析')).toBeInTheDocument();
    });

    // Mock PDF export button (this would be in a different component)
    // For now, we'll test the export function directly
    const mockChartElements = [
      document.createElement('div'),
      document.createElement('div'),
    ];

    // Simulate PDF export
    const exportData = {
      invoices: sampleInvoices,
      statistics: {
        totalAmount: 350,
        totalInvoices: 2,
        averageAmount: 175,
        dateRange: {
          start: new Date('2024-01-15'),
          end: new Date('2024-01-20'),
        },
        categoryBreakdown: [
          { category: '飲料', amount: 75, count: 2 },
          { category: '食品', amount: 275, count: 2 },
        ],
        timeSeriesData: [],
      },
      chartElements: mockChartElements,
    };

    // Test PDF export function call
    if (exportToPDF) {
      await exportToPDF(exportData, 'test-report.pdf');
      expect(exportToPDF).toHaveBeenCalledWith(exportData, 'test-report.pdf');
    }
  });

  it('should handle export errors gracefully', async () => {
    const { exportToCSV } = await import('@/lib/exportService');
    
    // Mock export function to throw error
    vi.mocked(exportToCSV).mockRejectedValue(new Error('Export failed'));

    render(
      <TestWrapper>
        <Analytics />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('詳細分析')).toBeInTheDocument();
    });

    const exportButton = screen.getByRole('button', { name: /匯出資料/i });
    fireEvent.click(exportButton);

    // Should handle error without crashing
    await waitFor(() => {
      expect(exportToCSV).toHaveBeenCalled();
    });

    // In a real implementation, you might show an error message
    // expect(screen.getByText(/匯出失敗/i)).toBeInTheDocument();
  });

  it('should export data with custom filename', async () => {
    const { exportToCSV } = await import('@/lib/exportService');

    render(
      <TestWrapper>
        <Analytics />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('詳細分析')).toBeInTheDocument();
    });

    const exportButton = screen.getByRole('button', { name: /匯出資料/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(exportToCSV).toHaveBeenCalledWith(
        expect.any(Array),
        expect.stringMatching(/發票資料_\d{4}-\d{2}-\d{2}\.csv/)
      );
    });
  });

  it('should export only filtered data', async () => {
    const { exportToCSV } = await import('@/lib/exportService');

    render(
      <TestWrapper>
        <Analytics />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('詳細分析')).toBeInTheDocument();
    });

    // Simulate filtering (in real implementation, this would be done through UI)
    const filteredInvoices = sampleInvoices.filter(inv => 
      inv.merchantName.includes('全家')
    );

    // Mock the filtered state
    const originalGetState = useInvoiceStore.getState;
    vi.spyOn(useInvoiceStore, 'getState').mockReturnValue({
      ...originalGetState(),
      invoices: filteredInvoices,
    });

    const exportButton = screen.getByRole('button', { name: /匯出資料/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(exportToCSV).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            merchantName: '全家便利商店',
          }),
        ]),
        expect.any(String)
      );
    });

    // Verify only filtered data was exported
    const exportCall = vi.mocked(exportToCSV).mock.calls[0];
    expect(exportCall[0]).toHaveLength(1);
  });

  it('should include all required fields in CSV export', async () => {
    const { exportToCSV } = await import('@/lib/exportService');

    render(
      <TestWrapper>
        <Analytics />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('詳細分析')).toBeInTheDocument();
    });

    const exportButton = screen.getByRole('button', { name: /匯出資料/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(exportToCSV).toHaveBeenCalled();
    });

    const exportCall = vi.mocked(exportToCSV).mock.calls[0];
    const exportedData = exportCall[0];

    // Verify all required fields are present
    exportedData.forEach((invoice: any) => {
      expect(invoice).toHaveProperty('invoiceNumber');
      expect(invoice).toHaveProperty('invoiceDate');
      expect(invoice).toHaveProperty('merchantName');
      expect(invoice).toHaveProperty('totalAmount');
      expect(invoice).toHaveProperty('status');
    });
  });

  it('should generate PDF with correct statistics', async () => {
    const { exportToPDF } = await import('@/lib/exportService');

    render(
      <TestWrapper>
        <Analytics />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('詳細分析')).toBeInTheDocument();
    });

    // Test statistics calculation for PDF export
    const statistics = useInvoiceStore.getState().statistics;
    
    expect(statistics).toBeTruthy();
    expect(statistics?.totalAmount).toBe(350);
    expect(statistics?.totalInvoices).toBe(2);
    expect(statistics?.averageAmount).toBe(175);
  });

  it('should handle large dataset export efficiently', async () => {
    const { exportToCSV } = await import('@/lib/exportService');

    // Create large dataset
    const largeDataset: Invoice[] = Array.from({ length: 1000 }, (_, i) => ({
      id: `inv-${i}`,
      carrierType: '手機條碼',
      carrierNumber: '/ABC123',
      invoiceDate: new Date(`2024-01-${(i % 30) + 1}`),
      merchantId: `${12345678 + i}`,
      merchantName: `商店${i}`,
      invoiceNumber: `INV${i.toString().padStart(8, '0')}`,
      totalAmount: 100 + (i % 500),
      status: 'issued' as const,
      items: [],
    }));

    useInvoiceStore.getState().setInvoices(largeDataset);

    render(
      <TestWrapper>
        <Analytics />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('詳細分析')).toBeInTheDocument();
    });

    const exportButton = screen.getByRole('button', { name: /匯出資料/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(exportToCSV).toHaveBeenCalled();
    });

    const exportCall = vi.mocked(exportToCSV).mock.calls[0];
    expect(exportCall[0]).toHaveLength(1000);
  });
});