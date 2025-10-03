import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateBasicStatistics,
  calculateExtendedStatistics,
  calculateCategoryBreakdown,
  calculateTimeSeriesData,
  calculateMonthlyStatistics,
  calculateMerchantStatistics,
  calculateItemFrequencyStats,
  calculateVoidedInvoiceStats,
  categorizeItemAdvanced,
  filterInvoicesByDateRange,
  filterInvoicesByMerchant,
  filterInvoicesByAmountRange,
  filterInvoicesByCategory,
  getValidInvoices,
  getVoidedInvoices,
} from '../lib/statisticsService';
import { Invoice, InvoiceItem } from '../types';

describe('Statistics Service', () => {
  let sampleInvoices: Invoice[];
  let sampleItems: InvoiceItem[];

  beforeEach(() => {
    // Create sample data for testing
    sampleItems = [
      {
        id: 'item1',
        invoiceNumber: 'INV001',
        itemName: '咖啡',
        amount: 50,
        category: '飲料',
      },
      {
        id: 'item2',
        invoiceNumber: 'INV001',
        itemName: '蛋糕',
        amount: 80,
        category: '點心零食',
      },
      {
        id: 'item3',
        invoiceNumber: 'INV002',
        itemName: '便當',
        amount: 120,
        category: '餐食',
      },
      {
        id: 'item4',
        invoiceNumber: 'INV003',
        itemName: '汽油',
        amount: 500,
        category: '交通',
      },
    ];

    sampleInvoices = [
      {
        id: 'inv1',
        carrierType: '手機條碼',
        carrierNumber: '/ABC123',
        invoiceDate: new Date('2024-01-15'),
        merchantId: '12345678',
        merchantName: '便利商店A',
        invoiceNumber: 'INV001',
        totalAmount: 130,
        status: 'issued',
        items: [sampleItems[0], sampleItems[1]],
      },
      {
        id: 'inv2',
        carrierType: '手機條碼',
        carrierNumber: '/ABC123',
        invoiceDate: new Date('2024-01-20'),
        merchantId: '87654321',
        merchantName: '餐廳B',
        invoiceNumber: 'INV002',
        totalAmount: 120,
        status: 'issued',
        items: [sampleItems[2]],
      },
      {
        id: 'inv3',
        carrierType: '手機條碼',
        carrierNumber: '/ABC123',
        invoiceDate: new Date('2024-02-10'),
        merchantId: '11111111',
        merchantName: '加油站C',
        invoiceNumber: 'INV003',
        totalAmount: 500,
        status: 'issued',
        items: [sampleItems[3]],
      },
      {
        id: 'inv4',
        carrierType: '手機條碼',
        carrierNumber: '/ABC123',
        invoiceDate: new Date('2024-01-25'),
        merchantId: '22222222',
        merchantName: '便利商店D',
        invoiceNumber: 'INV004',
        totalAmount: 200,
        status: 'voided', // Voided invoice
        items: [],
      },
    ];
  });

  describe('calculateBasicStatistics', () => {
    it('should calculate correct basic statistics for valid invoices', () => {
      const validInvoices = sampleInvoices.filter(inv => inv.status === 'issued');
      const stats = calculateBasicStatistics(validInvoices);

      expect(stats.totalAmount).toBe(750); // 130 + 120 + 500
      expect(stats.totalInvoices).toBe(3);
      expect(stats.averageAmount).toBe(250); // 750 / 3
      expect(stats.dateRange.start).toEqual(new Date('2024-01-15'));
      expect(stats.dateRange.end).toEqual(new Date('2024-02-10'));
      expect(stats.categoryBreakdown).toHaveLength(4); // 飲料, 點心零食, 餐食, 交通
      expect(stats.timeSeriesData).toHaveLength(3); // 3 different dates
    });

    it('should return zero statistics for empty invoice array', () => {
      const stats = calculateBasicStatistics([]);

      expect(stats.totalAmount).toBe(0);
      expect(stats.totalInvoices).toBe(0);
      expect(stats.averageAmount).toBe(0);
      expect(stats.categoryBreakdown).toHaveLength(0);
      expect(stats.timeSeriesData).toHaveLength(0);
    });
  });

  describe('calculateCategoryBreakdown', () => {
    it('should calculate category breakdown correctly', () => {
      const validInvoices = sampleInvoices.filter(inv => inv.status === 'issued');
      const breakdown = calculateCategoryBreakdown(validInvoices);

      expect(breakdown).toHaveLength(4);
      
      // Should be sorted by amount (descending)
      expect(breakdown[0].category).toBe('交通');
      expect(breakdown[0].amount).toBe(500);
      expect(breakdown[0].count).toBe(1);
      expect(breakdown[0].percentage).toBeCloseTo(66.67, 1); // 500/750 * 100

      expect(breakdown[1].category).toBe('餐食');
      expect(breakdown[1].amount).toBe(120);
      expect(breakdown[1].count).toBe(1);
      expect(breakdown[1].percentage).toBe(16); // 120/750 * 100
    });

    it('should handle invoices with no items', () => {
      const invoicesWithoutItems = [
        {
          ...sampleInvoices[0],
          items: [],
        },
      ];
      const breakdown = calculateCategoryBreakdown(invoicesWithoutItems);

      expect(breakdown).toHaveLength(0);
    });
  });

  describe('calculateTimeSeriesData', () => {
    it('should calculate time series data correctly', () => {
      const validInvoices = sampleInvoices.filter(inv => inv.status === 'issued');
      const timeSeriesData = calculateTimeSeriesData(validInvoices);

      expect(timeSeriesData).toHaveLength(3);
      
      // Should be sorted by date (ascending)
      expect(timeSeriesData[0].date).toEqual(new Date('2024-01-15'));
      expect(timeSeriesData[0].amount).toBe(130);
      expect(timeSeriesData[0].count).toBe(1);

      expect(timeSeriesData[1].date).toEqual(new Date('2024-01-20'));
      expect(timeSeriesData[1].amount).toBe(120);
      expect(timeSeriesData[1].count).toBe(1);

      expect(timeSeriesData[2].date).toEqual(new Date('2024-02-10'));
      expect(timeSeriesData[2].amount).toBe(500);
      expect(timeSeriesData[2].count).toBe(1);
    });
  });

  describe('calculateMonthlyStatistics', () => {
    it('should calculate monthly statistics correctly', () => {
      const validInvoices = sampleInvoices.filter(inv => inv.status === 'issued');
      const monthlyStats = calculateMonthlyStatistics(validInvoices);

      expect(monthlyStats).toHaveLength(2); // January and February 2024

      // January 2024
      expect(monthlyStats[0].year).toBe(2024);
      expect(monthlyStats[0].month).toBe(1);
      expect(monthlyStats[0].totalAmount).toBe(250); // 130 + 120
      expect(monthlyStats[0].invoiceCount).toBe(2);
      expect(monthlyStats[0].averageAmount).toBe(125);

      // February 2024
      expect(monthlyStats[1].year).toBe(2024);
      expect(monthlyStats[1].month).toBe(2);
      expect(monthlyStats[1].totalAmount).toBe(500);
      expect(monthlyStats[1].invoiceCount).toBe(1);
      expect(monthlyStats[1].averageAmount).toBe(500);
    });
  });

  describe('calculateMerchantStatistics', () => {
    it('should calculate merchant statistics correctly', () => {
      const validInvoices = sampleInvoices.filter(inv => inv.status === 'issued');
      const merchantStats = calculateMerchantStatistics(validInvoices);

      expect(merchantStats).toHaveLength(3);
      
      // Should be sorted by total amount (descending)
      expect(merchantStats[0].merchantName).toBe('加油站C');
      expect(merchantStats[0].totalAmount).toBe(500);
      expect(merchantStats[0].invoiceCount).toBe(1);
      expect(merchantStats[0].averageAmount).toBe(500);
      expect(merchantStats[0].percentage).toBeCloseTo(66.67, 1);
    });
  });

  describe('calculateItemFrequencyStats', () => {
    it('should calculate item frequency statistics correctly', () => {
      const validInvoices = sampleInvoices.filter(inv => inv.status === 'issued');
      const itemStats = calculateItemFrequencyStats(validInvoices);

      expect(itemStats).toHaveLength(4);
      
      // All items appear once, so should be sorted by frequency (all 1) then by other criteria
      const coffeeItem = itemStats.find(item => item.itemName === '咖啡');
      expect(coffeeItem).toBeDefined();
      expect(coffeeItem!.frequency).toBe(1);
      expect(coffeeItem!.totalAmount).toBe(50);
      expect(coffeeItem!.averagePrice).toBe(50);
      expect(coffeeItem!.category).toBe('飲料');
    });
  });

  describe('calculateVoidedInvoiceStats', () => {
    it('should calculate voided invoice statistics correctly', () => {
      const voidedInvoices = sampleInvoices.filter(inv => inv.status === 'voided');
      const voidedStats = calculateVoidedInvoiceStats(sampleInvoices, voidedInvoices);

      expect(voidedStats.totalVoidedInvoices).toBe(1);
      expect(voidedStats.totalVoidedAmount).toBe(200);
      expect(voidedStats.voidedPercentage).toBe(25); // 1/4 * 100
    });

    it('should handle no voided invoices', () => {
      const validInvoices = sampleInvoices.filter(inv => inv.status === 'issued');
      const voidedStats = calculateVoidedInvoiceStats(validInvoices, []);

      expect(voidedStats.totalVoidedInvoices).toBe(0);
      expect(voidedStats.totalVoidedAmount).toBe(0);
      expect(voidedStats.voidedPercentage).toBe(0);
    });
  });

  describe('categorizeItemAdvanced', () => {
    it('should categorize beverages correctly', () => {
      expect(categorizeItemAdvanced('咖啡')).toBe('飲料');
      expect(categorizeItemAdvanced('奶茶')).toBe('飲料');
      expect(categorizeItemAdvanced('可樂')).toBe('飲料');
      expect(categorizeItemAdvanced('礦泉水')).toBe('飲料');
    });

    it('should categorize snacks correctly', () => {
      expect(categorizeItemAdvanced('蛋糕')).toBe('點心零食');
      expect(categorizeItemAdvanced('餅乾')).toBe('點心零食');
      expect(categorizeItemAdvanced('巧克力')).toBe('點心零食');
      expect(categorizeItemAdvanced('洋芋片')).toBe('點心零食');
    });

    it('should categorize meals correctly', () => {
      expect(categorizeItemAdvanced('便當')).toBe('餐食');
      expect(categorizeItemAdvanced('牛肉麵')).toBe('餐食');
      expect(categorizeItemAdvanced('炒飯')).toBe('餐食');
      expect(categorizeItemAdvanced('雞腿')).toBe('餐食');
    });

    it('should categorize daily necessities correctly', () => {
      expect(categorizeItemAdvanced('衛生紙')).toBe('日用品');
      expect(categorizeItemAdvanced('洗髮精')).toBe('日用品');
      expect(categorizeItemAdvanced('牙膏')).toBe('日用品');
    });

    it('should categorize transportation correctly', () => {
      expect(categorizeItemAdvanced('汽油')).toBe('交通');
      expect(categorizeItemAdvanced('停車費')).toBe('交通');
      expect(categorizeItemAdvanced('捷運')).toBe('交通');
    });

    it('should return default category for unknown items', () => {
      expect(categorizeItemAdvanced('未知商品')).toBe('其他');
      expect(categorizeItemAdvanced('random item')).toBe('其他');
    });
  });

  describe('Filter Functions', () => {
    describe('filterInvoicesByDateRange', () => {
      it('should filter invoices by date range correctly', () => {
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-01-31');
        const filtered = filterInvoicesByDateRange(sampleInvoices, startDate, endDate);

        expect(filtered).toHaveLength(3); // 3 invoices in January
        expect(filtered.every(inv => inv.invoiceDate >= startDate && inv.invoiceDate <= endDate)).toBe(true);
      });
    });

    describe('filterInvoicesByMerchant', () => {
      it('should filter invoices by merchant name correctly', () => {
        const filtered = filterInvoicesByMerchant(sampleInvoices, '便利商店');

        expect(filtered).toHaveLength(2); // 便利商店A and 便利商店D
        expect(filtered.every(inv => inv.merchantName.includes('便利商店'))).toBe(true);
      });

      it('should be case insensitive', () => {
        const filtered = filterInvoicesByMerchant(sampleInvoices, '便利商店');

        expect(filtered).toHaveLength(2);
      });
    });

    describe('filterInvoicesByAmountRange', () => {
      it('should filter invoices by amount range correctly', () => {
        const filtered = filterInvoicesByAmountRange(sampleInvoices, 100, 200);

        expect(filtered).toHaveLength(3); // 130, 120, 200
        expect(filtered.every(inv => inv.totalAmount >= 100 && inv.totalAmount <= 200)).toBe(true);
      });
    });

    describe('filterInvoicesByCategory', () => {
      it('should filter invoices by category correctly', () => {
        const filtered = filterInvoicesByCategory(sampleInvoices, '飲料');

        expect(filtered).toHaveLength(1); // Only INV001 has 飲料 items
        expect(filtered[0].invoiceNumber).toBe('INV001');
      });
    });

    describe('getValidInvoices', () => {
      it('should return only issued invoices', () => {
        const validInvoices = getValidInvoices(sampleInvoices);

        expect(validInvoices).toHaveLength(3);
        expect(validInvoices.every(inv => inv.status === 'issued')).toBe(true);
      });
    });

    describe('getVoidedInvoices', () => {
      it('should return only voided invoices', () => {
        const voidedInvoices = getVoidedInvoices(sampleInvoices);

        expect(voidedInvoices).toHaveLength(1);
        expect(voidedInvoices.every(inv => inv.status === 'voided')).toBe(true);
      });
    });
  });

  describe('calculateExtendedStatistics', () => {
    it('should calculate extended statistics correctly', () => {
      const extendedStats = calculateExtendedStatistics(sampleInvoices);

      // Basic statistics should be included
      expect(extendedStats.totalAmount).toBe(750);
      expect(extendedStats.totalInvoices).toBe(3);
      expect(extendedStats.averageAmount).toBe(250);

      // Extended statistics should be included
      expect(extendedStats.monthlyData).toHaveLength(2);
      expect(extendedStats.topMerchants).toHaveLength(3);
      expect(extendedStats.itemFrequency).toHaveLength(4);
      expect(extendedStats.voidedInvoicesStats.totalVoidedInvoices).toBe(1);
    });
  });
});