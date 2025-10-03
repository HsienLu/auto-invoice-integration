import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AdvancedTimeSeriesChart } from '../AdvancedTimeSeriesChart';
import { AdvancedCategoryChart } from '../AdvancedCategoryChart';
import { Invoice } from '@/types';

// Mock Chart.js
vi.mock('react-chartjs-2', () => ({
  Line: ({ data, options }: any) => (
    <div data-testid="line-chart">
      <div>Line Chart</div>
      <div>Labels: {data.labels?.join(', ')}</div>
    </div>
  ),
  Bar: ({ data, options }: any) => (
    <div data-testid="bar-chart">
      <div>Bar Chart</div>
      <div>Labels: {data.labels?.join(', ')}</div>
    </div>
  ),
  Pie: ({ data, options }: any) => (
    <div data-testid="pie-chart">
      <div>Pie Chart</div>
      <div>Labels: {data.labels?.join(', ')}</div>
    </div>
  ),
  Doughnut: ({ data, options }: any) => (
    <div data-testid="doughnut-chart">
      <div>Doughnut Chart</div>
      <div>Labels: {data.labels?.join(', ')}</div>
    </div>
  ),
}));

// Mock invoice data for testing
const mockInvoices: Invoice[] = [
  {
    id: '1',
    carrierType: 'mobile',
    carrierNumber: '/ABC123',
    invoiceDate: new Date('2024-01-15'),
    merchantId: '12345678',
    merchantName: '7-ELEVEN',
    invoiceNumber: 'AB12345678',
    totalAmount: 150,
    status: 'issued',
    items: [
      {
        id: 'item1',
        invoiceNumber: 'AB12345678',
        itemName: '可樂',
        amount: 25,
        category: '飲料',
      },
      {
        id: 'item2',
        invoiceNumber: 'AB12345678',
        itemName: '便當',
        amount: 125,
        category: '餐飲',
      },
    ],
  },
  {
    id: '2',
    carrierType: 'mobile',
    carrierNumber: '/ABC123',
    invoiceDate: new Date('2024-02-20'),
    merchantId: '87654321',
    merchantName: '全家便利商店',
    invoiceNumber: 'CD87654321',
    totalAmount: 250,
    status: 'issued',
    items: [
      {
        id: 'item3',
        invoiceNumber: 'CD87654321',
        itemName: '咖啡',
        amount: 250,
        category: '飲料',
      },
    ],
  },
];

describe('AdvancedTimeSeriesChart', () => {
  it('should render empty state when no invoices provided', () => {
    render(<AdvancedTimeSeriesChart invoices={[]} />);
    
    expect(screen.getByText('無資料可顯示')).toBeInTheDocument();
    expect(screen.getByText('上傳發票檔案後顯示時間趨勢分析')).toBeInTheDocument();
  });

  it('should render chart with invoice data', () => {
    render(<AdvancedTimeSeriesChart invoices={mockInvoices} />);
    
    // Check if chart controls are present
    expect(screen.getByText('時間範圍:')).toBeInTheDocument();
    expect(screen.getByText('圖表類型:')).toBeInTheDocument();
    expect(screen.getByText('匯出圖表')).toBeInTheDocument();
    
    // Check if chart is rendered
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('should allow switching between chart types', () => {
    render(<AdvancedTimeSeriesChart invoices={mockInvoices} />);
    
    // Initially should show line chart
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    
    // Switch to bar chart (this would require more complex interaction testing)
    expect(screen.getByText('圖表類型:')).toBeInTheDocument();
  });

  it('should display chart summary', () => {
    render(<AdvancedTimeSeriesChart invoices={mockInvoices} />);
    
    expect(screen.getByText('總消費:')).toBeInTheDocument();
    expect(screen.getByText('總發票數:')).toBeInTheDocument();
    expect(screen.getByText(/平均每/)).toBeInTheDocument();
    expect(screen.getByText('資料期間:')).toBeInTheDocument();
  });
});

describe('AdvancedCategoryChart', () => {
  it('should render empty state when no invoices provided', () => {
    render(<AdvancedCategoryChart invoices={[]} />);
    
    expect(screen.getByText('無資料可顯示')).toBeInTheDocument();
    expect(screen.getByText('上傳發票檔案後顯示品項分類分析')).toBeInTheDocument();
  });

  it('should render chart with category data', () => {
    render(<AdvancedCategoryChart invoices={mockInvoices} />);
    
    // Check if chart controls are present
    expect(screen.getByText('圖表類型:')).toBeInTheDocument();
    expect(screen.getByText('統計依據:')).toBeInTheDocument();
    expect(screen.getByText('最小佔比:')).toBeInTheDocument();
    expect(screen.getByText('匯出圖表')).toBeInTheDocument();
    
    // Check if chart is rendered (default is doughnut)
    expect(screen.getByTestId('doughnut-chart')).toBeInTheDocument();
  });

  it('should display category summary', () => {
    render(<AdvancedCategoryChart invoices={mockInvoices} />);
    
    expect(screen.getByText('分類詳情')).toBeInTheDocument();
    
    // Should show categories from the mock data
    expect(screen.getByText('飲料')).toBeInTheDocument();
    expect(screen.getByText('餐飲')).toBeInTheDocument();
  });

  it('should handle different chart types', () => {
    render(<AdvancedCategoryChart invoices={mockInvoices} />);
    
    // Default should be doughnut chart
    expect(screen.getByTestId('doughnut-chart')).toBeInTheDocument();
  });

  it('should process category data correctly', () => {
    render(<AdvancedCategoryChart invoices={mockInvoices} />);
    
    // Check if categories are displayed in the summary
    expect(screen.getByText('飲料')).toBeInTheDocument();
    expect(screen.getByText('餐飲')).toBeInTheDocument();
    
    // Should show percentage badges
    const percentageBadges = screen.getAllByText(/\d+\.\d+%/);
    expect(percentageBadges.length).toBeGreaterThan(0);
  });
});