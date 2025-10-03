import { describe, it, expect } from 'vitest';
import { applyFilters, getFilteredData, hasActiveFilters, createEmptyFilters, validateFilters } from '../filterService';
import { Invoice, FilterCriteria } from '@/types';

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
    items: [],
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
    items: [],
  },
  {
    id: '3',
    carrierType: 'mobile',
    carrierNumber: '/ABC123',
    invoiceDate: new Date('2024-01-10'),
    merchantId: '11111111',
    merchantName: '麥當勞',
    invoiceNumber: 'EF11111111',
    totalAmount: 300,
    status: 'voided',
    items: [],
  },
];

describe('filterService', () => {
  describe('applyFilters', () => {
    it('should return all issued invoices when no filters are applied', () => {
      const filters = createEmptyFilters();
      const result = applyFilters(mockInvoices, filters);
      
      expect(result).toHaveLength(2); // Only issued invoices
      expect(result.every(invoice => invoice.status === 'issued')).toBe(true);
    });

    it('should filter by date range', () => {
      const filters: FilterCriteria = {
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31'),
        },
        merchantName: '',
        amountRange: {
          min: null,
          max: null,
        },
      };
      
      const result = applyFilters(mockInvoices, filters);
      expect(result).toHaveLength(1);
      expect(result[0].invoiceNumber).toBe('AB12345678');
    });

    it('should filter by merchant name', () => {
      const filters: FilterCriteria = {
        dateRange: {
          start: null,
          end: null,
        },
        merchantName: '7-ELEVEN',
        amountRange: {
          min: null,
          max: null,
        },
      };
      
      const result = applyFilters(mockInvoices, filters);
      expect(result).toHaveLength(1);
      expect(result[0].merchantName).toBe('7-ELEVEN');
    });

    it('should filter by amount range', () => {
      const filters: FilterCriteria = {
        dateRange: {
          start: null,
          end: null,
        },
        merchantName: '',
        amountRange: {
          min: 200,
          max: 300,
        },
      };
      
      const result = applyFilters(mockInvoices, filters);
      expect(result).toHaveLength(1);
      expect(result[0].totalAmount).toBe(250);
    });

    it('should combine multiple filters', () => {
      const filters: FilterCriteria = {
        dateRange: {
          start: new Date('2024-02-01'),
          end: new Date('2024-02-28'),
        },
        merchantName: '全家',
        amountRange: {
          min: 200,
          max: 300,
        },
      };
      
      const result = applyFilters(mockInvoices, filters);
      expect(result).toHaveLength(1);
      expect(result[0].invoiceNumber).toBe('CD87654321');
    });
  });

  describe('hasActiveFilters', () => {
    it('should return false for empty filters', () => {
      const filters = createEmptyFilters();
      expect(hasActiveFilters(filters)).toBe(false);
    });

    it('should return true when date range is set', () => {
      const filters = createEmptyFilters();
      filters.dateRange.start = new Date();
      expect(hasActiveFilters(filters)).toBe(true);
    });

    it('should return true when merchant name is set', () => {
      const filters = createEmptyFilters();
      filters.merchantName = '7-ELEVEN';
      expect(hasActiveFilters(filters)).toBe(true);
    });

    it('should return true when amount range is set', () => {
      const filters = createEmptyFilters();
      filters.amountRange.min = 100;
      expect(hasActiveFilters(filters)).toBe(true);
    });
  });

  describe('validateFilters', () => {
    it('should validate correct filters', () => {
      const filters = createEmptyFilters();
      const result = validateFilters(filters);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid date range', () => {
      const filters: FilterCriteria = {
        dateRange: {
          start: new Date('2024-02-01'),
          end: new Date('2024-01-01'),
        },
        merchantName: '',
        amountRange: {
          min: null,
          max: null,
        },
      };
      
      const result = validateFilters(filters);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('開始日期不能晚於結束日期');
    });

    it('should detect invalid amount range', () => {
      const filters: FilterCriteria = {
        dateRange: {
          start: null,
          end: null,
        },
        merchantName: '',
        amountRange: {
          min: 300,
          max: 100,
        },
      };
      
      const result = validateFilters(filters);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('最小金額不能大於最大金額');
    });

    it('should detect negative amounts', () => {
      const filters: FilterCriteria = {
        dateRange: {
          start: null,
          end: null,
        },
        merchantName: '',
        amountRange: {
          min: -100,
          max: null,
        },
      };
      
      const result = validateFilters(filters);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('最小金額不能為負數');
    });
  });
});