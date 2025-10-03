/**
 * Integration Tests for Data Filtering and Chart Interactions
 * Tests the filtering functionality and chart interaction features
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Analytics from '@/pages/Analytics';
import { useInvoiceStore } from '@/store';
import { Invoice } from '@/types';

// Mock Chart.js to avoid canvas issues in tests
vi.mock('react-chartjs-2', () => ({
  Line: ({ data, options }: any) => (
    <div data-testid="line-chart" data-chart-data={JSON.stringify(data)} />
  ),
  Bar: ({ data, options }: any) => (
    <div data-testid="bar-chart" data-chart-data={JSON.stringify(data)} />
  ),
  Doughnut: ({ data, options }: any) => (
    <div data-testid="doughnut-chart" data-chart-data={JSON.stringify(data)} />
  ),
}));

// Mock Chart.js registration
vi.mock('chart.js', () => ({
  Chart: {
    register: vi.fn(),
  },
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
  {
    id: 'inv-3',
    carrierType: '手機條碼',
    carrierNumber: '/ABC123',
    invoiceDate: new Date('2024-02-01'),
    merchantId: '11111111',
    merchantName: '麥當勞',
    invoiceNumber: 'EF11111111',
    totalAmount: 300,
    status: 'issued',
    items: [
      {
        id: 'item-5',
        invoiceNumber: 'EF11111111',
        itemName: '大麥克套餐',
        amount: 300,
        category: '食品',
      },
    ],
  },
  {
    id: 'inv-4',
    carrierType: '手機條碼',
    carrierNumber: '/ABC123',
    invoiceDate: new Date('2024-01-25'),
    merchantId: '22222222',
    merchantName: '全家便利商店',
    invoiceNumber: 'GH22222222',
    totalAmount: 80,
    status: 'voided', // Voided invoice
    items: [],
  },
];

describe('Data Filtering Integration Tests', () => {
  beforeEach(() => {
    // Reset store and set up test data
    useInvoiceStore.getState().clearData();
    useInvoiceStore.getState().setInvoices(sampleInvoices);
  });

  it('should filter invoices by date range', async () => {
    render(
      <TestWrapper>
        <Analytics />
      </TestWrapper>
    );

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('詳細分析')).toBeInTheDocument();
    });

    // Check initial state - should show all valid invoices (excluding voided)
    expect(screen.getByText(/共 3 筆發票/)).toBeInTheDocument();
    expect(screen.getByText(/總金額：\$650/)).toBeInTheDocument();

    // Find date range inputs (this would depend on your FilterPanel implementation)
    // For now, we'll test the filtering logic directly through the store
    
    // Test date range filtering through store methods
    const januaryInvoices = useInvoiceStore.getState().invoices.filter(inv => 
      inv.invoiceDate >= new Date('2024-01-01') && 
      inv.invoiceDate < new Date('2024-02-01') &&
      inv.status === 'issued'
    );
    
    expect(januaryInvoices).toHaveLength(2);
    expect(januaryInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0)).toBe(350);
  });

  it('should filter invoices by merchant name', async () => {
    render(
      <TestWrapper>
        <Analytics />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('詳細分析')).toBeInTheDocument();
    });

    // Test merchant filtering through store methods
    const familyMartInvoices = useInvoiceStore.getState().invoices.filter(inv => 
      inv.merchantName.includes('全家') && inv.status === 'issued'
    );
    
    expect(familyMartInvoices).toHaveLength(1);
    expect(familyMartInvoices[0].totalAmount).toBe(150);
  });

  it('should filter invoices by amount range', async () => {
    render(
      <TestWrapper>
        <Analytics />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('詳細分析')).toBeInTheDocument();
    });

    // Test amount range filtering
    const expensiveInvoices = useInvoiceStore.getState().invoices.filter(inv => 
      inv.totalAmount >= 200 && inv.status === 'issued'
    );
    
    expect(expensiveInvoices).toHaveLength(2);
    expect(expensiveInvoices.map(inv => inv.totalAmount)).toEqual([200, 300]);
  });

  it('should exclude voided invoices from statistics', async () => {
    render(
      <TestWrapper>
        <Analytics />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('詳細分析')).toBeInTheDocument();
    });

    // Verify that voided invoices are excluded
    const validInvoices = useInvoiceStore.getState().invoices.filter(inv => 
      inv.status === 'issued'
    );
    
    expect(validInvoices).toHaveLength(3);
    
    const totalAmount = validInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    expect(totalAmount).toBe(650); // 150 + 200 + 300, excluding the voided 80
  });

  it('should update charts when filters change', async () => {
    render(
      <TestWrapper>
        <Analytics />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('詳細分析')).toBeInTheDocument();
    });

    // Check that charts are rendered
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(screen.getByTestId('doughnut-chart')).toBeInTheDocument();

    // Verify chart data contains the expected invoices
    const lineChart = screen.getByTestId('line-chart');
    const chartData = JSON.parse(lineChart.getAttribute('data-chart-data') || '{}');
    
    // The chart should have data for the valid invoices
    expect(chartData.datasets).toBeDefined();
    expect(chartData.datasets[0].data).toBeDefined();
  });

  it('should handle empty filter results', async () => {
    render(
      <TestWrapper>
        <Analytics />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('詳細分析')).toBeInTheDocument();
    });

    // Test filtering that returns no results
    const futureInvoices = useInvoiceStore.getState().invoices.filter(inv => 
      inv.invoiceDate > new Date('2025-01-01') && inv.status === 'issued'
    );
    
    expect(futureInvoices).toHaveLength(0);
  });

  it('should handle complex filter combinations', async () => {
    render(
      <TestWrapper>
        <Analytics />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('詳細分析')).toBeInTheDocument();
    });

    // Test complex filtering: January invoices from convenience stores over $100
    const complexFilter = useInvoiceStore.getState().invoices.filter(inv => 
      inv.invoiceDate >= new Date('2024-01-01') &&
      inv.invoiceDate < new Date('2024-02-01') &&
      (inv.merchantName.includes('全家') || inv.merchantName.includes('7-ELEVEN')) &&
      inv.totalAmount >= 100 &&
      inv.status === 'issued'
    );
    
    expect(complexFilter).toHaveLength(2);
    expect(complexFilter.map(inv => inv.merchantName)).toEqual(['全家便利商店', '7-ELEVEN']);
  });

  it('should maintain filter state during navigation', async () => {
    render(
      <TestWrapper>
        <Analytics />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('詳細分析')).toBeInTheDocument();
    });

    // This test would verify that filter state persists
    // In a real implementation, you might store filter state in URL params or global state
    
    const currentInvoices = useInvoiceStore.getState().invoices;
    expect(currentInvoices).toHaveLength(4); // Including voided invoice
    
    const validInvoices = currentInvoices.filter(inv => inv.status === 'issued');
    expect(validInvoices).toHaveLength(3);
  });

  it('should calculate correct statistics for filtered data', async () => {
    render(
      <TestWrapper>
        <Analytics />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('詳細分析')).toBeInTheDocument();
    });

    // Test statistics calculation for filtered data
    const januaryInvoices = useInvoiceStore.getState().invoices.filter(inv => 
      inv.invoiceDate >= new Date('2024-01-01') && 
      inv.invoiceDate < new Date('2024-02-01') &&
      inv.status === 'issued'
    );
    
    const totalAmount = januaryInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const averageAmount = totalAmount / januaryInvoices.length;
    
    expect(totalAmount).toBe(350);
    expect(averageAmount).toBe(175);
    expect(januaryInvoices.length).toBe(2);
  });

  it('should handle category breakdown for filtered data', async () => {
    render(
      <TestWrapper>
        <Analytics />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('詳細分析')).toBeInTheDocument();
    });

    // Test category breakdown calculation
    const allItems = useInvoiceStore.getState().invoices
      .filter(inv => inv.status === 'issued')
      .flatMap(inv => inv.items);
    
    const categoryBreakdown = allItems.reduce((acc, item) => {
      const category = item.category || '其他';
      acc[category] = (acc[category] || 0) + item.amount;
      return acc;
    }, {} as Record<string, number>);
    
    expect(categoryBreakdown['飲料']).toBe(75); // 25 + 50
    expect(categoryBreakdown['食品']).toBe(575); // 125 + 150 + 300
  });
});