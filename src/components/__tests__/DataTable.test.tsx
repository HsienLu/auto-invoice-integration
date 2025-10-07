import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataTable } from '../DataTable';
import { Invoice } from '@/types';

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

describe('DataTable', () => {
  it('should render table with invoice data', () => {
    render(<DataTable invoices={mockInvoices} />);
    
    // Check if table headers are present
    expect(screen.getByText('發票號碼')).toBeInTheDocument();
    expect(screen.getByText('發票日期')).toBeInTheDocument();
    expect(screen.getByText('商店名稱')).toBeInTheDocument();
    expect(screen.getByText('品項名稱')).toBeInTheDocument();
    
    // Check if invoice data is displayed without duplicate rows
    expect(screen.getByText('AB12345678')).toBeInTheDocument();
    expect(screen.getByText('7-ELEVEN')).toBeInTheDocument();
    expect(screen.getByText('可樂')).toBeInTheDocument();
    expect(screen.getByText('便當')).toBeInTheDocument();
  });

  it('should show empty state when no invoices provided', () => {
    render(<DataTable invoices={[]} />);
    
    expect(screen.getByText('無資料可顯示')).toBeInTheDocument();
    expect(screen.getByText('請調整篩選條件或上傳發票檔案')).toBeInTheDocument();
  });

  it('should handle pagination controls', () => {
    // Create more invoices to test pagination
    const manyInvoices = Array.from({ length: 25 }, (_, i) => ({
      ...mockInvoices[0],
      id: `invoice-${i}`,
      invoiceNumber: `INV${i.toString().padStart(8, '0')}`,
      items: [],
    }));

    render(<DataTable invoices={manyInvoices} />);
    
    // Check pagination info
    expect(screen.getByText(/顯示第 1 - 20 筆，共 25 筆/)).toBeInTheDocument();
    expect(screen.getByText(/第 1 頁，共 2 頁/)).toBeInTheDocument();
  });

  it('should allow changing page size', () => {
    render(<DataTable invoices={mockInvoices} />);
    
    // Find the page size selector by text content
    const pageSizeSelect = screen.getByText('20');
    expect(pageSizeSelect).toBeInTheDocument();
  });

  it('should display correct status badges', () => {
    const invoicesWithVoided: Invoice[] = [
      ...mockInvoices,
      {
        ...mockInvoices[0],
        id: '3',
        invoiceNumber: 'VOIDED123',
        status: 'voided',
        items: [],
      },
    ];

    render(<DataTable invoices={invoicesWithVoided} />);
    
    // Check for status badges
    const normalBadges = screen.getAllByText('正常');
    const voidedBadges = screen.getAllByText('作廢');
    
    expect(normalBadges.length).toBeGreaterThan(0);
    expect(voidedBadges.length).toBe(1);
  });

  it('should handle column visibility toggle', () => {
    render(<DataTable invoices={mockInvoices} />);
    
    // Find and click the column settings button
    const settingsButton = screen.getByText('欄位設定');
    fireEvent.click(settingsButton);
    
    // Check if column visibility options are shown
    expect(screen.getByText('顯示欄位')).toBeInTheDocument();
  });

  it('should group invoice items into a single row per invoice', () => {
    render(<DataTable invoices={mockInvoices} />);

    // Should show 3 rows total (header + 2 invoice rows)
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(3);

    // Check if both items from first invoice are shown in the same row
    expect(screen.getByText('可樂')).toBeInTheDocument();
    expect(screen.getByText('便當')).toBeInTheDocument();
    expect(screen.getByText('咖啡')).toBeInTheDocument();
  });

  it('should merge duplicated invoices by invoice number', () => {
    const duplicatedInvoices: Invoice[] = [
      {
        ...mockInvoices[0],
        id: 'dup-1',
        items: [
          {
            id: 'dup-item-1',
            invoiceNumber: mockInvoices[0].invoiceNumber,
            itemName: '茶葉蛋',
            amount: 15,
            category: '餐飲',
          },
        ],
      },
      {
        ...mockInvoices[0],
        id: 'dup-2',
        items: [
          {
            id: 'dup-item-2',
            invoiceNumber: mockInvoices[0].invoiceNumber,
            itemName: '關東煮',
            amount: 45,
            category: '餐飲',
          },
        ],
      },
    ];

    render(<DataTable invoices={duplicatedInvoices} />);

    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(2);

    expect(screen.getByText('茶葉蛋')).toBeInTheDocument();
    expect(screen.getByText('關東煮')).toBeInTheDocument();
  });
});
