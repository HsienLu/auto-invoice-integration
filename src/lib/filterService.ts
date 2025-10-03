import { Invoice, FilterCriteria, FilteredData } from '@/types';
import { calculateBasicStatistics } from './statisticsService';

/**
 * Apply filters to invoices based on the given criteria
 */
export function applyFilters(invoices: Invoice[], filters: FilterCriteria): Invoice[] {
  return invoices.filter(invoice => {
    // Only include issued invoices (exclude voided)
    if (invoice.status !== 'issued') {
      return false;
    }

    // Date range filter
    if (filters.dateRange.start || filters.dateRange.end) {
      const invoiceDate = new Date(invoice.invoiceDate);
      
      if (filters.dateRange.start) {
        const startDate = new Date(filters.dateRange.start);
        startDate.setHours(0, 0, 0, 0);
        if (invoiceDate < startDate) {
          return false;
        }
      }
      
      if (filters.dateRange.end) {
        const endDate = new Date(filters.dateRange.end);
        endDate.setHours(23, 59, 59, 999);
        if (invoiceDate > endDate) {
          return false;
        }
      }
    }

    // Merchant name filter
    if (filters.merchantName.trim()) {
      const searchTerm = filters.merchantName.toLowerCase().trim();
      const merchantName = invoice.merchantName.toLowerCase();
      if (!merchantName.includes(searchTerm)) {
        return false;
      }
    }

    // Amount range filter
    if (filters.amountRange.min !== null || filters.amountRange.max !== null) {
      const amount = invoice.totalAmount;
      
      if (filters.amountRange.min !== null && amount < filters.amountRange.min) {
        return false;
      }
      
      if (filters.amountRange.max !== null && amount > filters.amountRange.max) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Get filtered data including invoices and recalculated statistics
 */
export function getFilteredData(invoices: Invoice[], filters: FilterCriteria): FilteredData {
  const filteredInvoices = applyFilters(invoices, filters);
  const statistics = calculateBasicStatistics(filteredInvoices);
  
  return {
    invoices: filteredInvoices,
    statistics,
  };
}

/**
 * Check if any filters are active
 */
export function hasActiveFilters(filters: FilterCriteria): boolean {
  return !!(
    filters.dateRange.start ||
    filters.dateRange.end ||
    filters.merchantName.trim() ||
    filters.amountRange.min !== null ||
    filters.amountRange.max !== null
  );
}

/**
 * Get a summary of active filters for display
 */
export function getFilterSummary(filters: FilterCriteria): string[] {
  const summary: string[] = [];
  
  if (filters.dateRange.start) {
    summary.push(`開始日期: ${filters.dateRange.start.toLocaleDateString('zh-TW')}`);
  }
  
  if (filters.dateRange.end) {
    summary.push(`結束日期: ${filters.dateRange.end.toLocaleDateString('zh-TW')}`);
  }
  
  if (filters.merchantName.trim()) {
    summary.push(`商店: ${filters.merchantName}`);
  }
  
  if (filters.amountRange.min !== null) {
    summary.push(`最小金額: $${filters.amountRange.min}`);
  }
  
  if (filters.amountRange.max !== null) {
    summary.push(`最大金額: $${filters.amountRange.max}`);
  }
  
  return summary;
}

/**
 * Create empty filter criteria
 */
export function createEmptyFilters(): FilterCriteria {
  return {
    dateRange: {
      start: null,
      end: null,
    },
    merchantName: '',
    amountRange: {
      min: null,
      max: null,
    },
  };
}

/**
 * Validate filter criteria
 */
export function validateFilters(filters: FilterCriteria): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Validate date range
  if (filters.dateRange.start && filters.dateRange.end) {
    if (filters.dateRange.start > filters.dateRange.end) {
      errors.push('開始日期不能晚於結束日期');
    }
  }
  
  // Validate amount range
  if (filters.amountRange.min !== null && filters.amountRange.max !== null) {
    if (filters.amountRange.min > filters.amountRange.max) {
      errors.push('最小金額不能大於最大金額');
    }
  }
  
  if (filters.amountRange.min !== null && filters.amountRange.min < 0) {
    errors.push('最小金額不能為負數');
  }
  
  if (filters.amountRange.max !== null && filters.amountRange.max < 0) {
    errors.push('最大金額不能為負數');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}