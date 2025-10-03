/**
 * Integration layer for statistics service with the store
 * This file provides utility functions to integrate the statistics service with the Zustand store
 */

import { useInvoiceStore } from '@/store';
import { 
  calculateExtendedStatistics, 
  getValidInvoices, 
  getVoidedInvoices,
  filterInvoicesByDateRange,
  filterInvoicesByMerchant,
  filterInvoicesByAmountRange,
  filterInvoicesByCategory,
  type ExtendedStatistics 
} from './statisticsService';
import { Invoice } from '@/types';

/**
 * Get extended statistics from the current store state
 */
export function getExtendedStatisticsFromStore(): ExtendedStatistics | null {
  const invoices = useInvoiceStore.getState().invoices;
  if (invoices.length === 0) {
    return null;
  }
  return calculateExtendedStatistics(invoices);
}

/**
 * Get valid invoices from the store (excluding voided ones)
 */
export function getValidInvoicesFromStore(): Invoice[] {
  const invoices = useInvoiceStore.getState().invoices;
  return getValidInvoices(invoices);
}

/**
 * Get voided invoices from the store
 */
export function getVoidedInvoicesFromStore(): Invoice[] {
  const invoices = useInvoiceStore.getState().invoices;
  return getVoidedInvoices(invoices);
}

/**
 * Filter store invoices by date range
 */
export function filterStoreInvoicesByDateRange(startDate: Date, endDate: Date): Invoice[] {
  const invoices = useInvoiceStore.getState().invoices;
  return filterInvoicesByDateRange(invoices, startDate, endDate);
}

/**
 * Filter store invoices by merchant
 */
export function filterStoreInvoicesByMerchant(merchantName: string): Invoice[] {
  const invoices = useInvoiceStore.getState().invoices;
  return filterInvoicesByMerchant(invoices, merchantName);
}

/**
 * Filter store invoices by amount range
 */
export function filterStoreInvoicesByAmountRange(minAmount: number, maxAmount: number): Invoice[] {
  const invoices = useInvoiceStore.getState().invoices;
  return filterInvoicesByAmountRange(invoices, minAmount, maxAmount);
}

/**
 * Filter store invoices by category
 */
export function filterStoreInvoicesByCategory(category: string): Invoice[] {
  const invoices = useInvoiceStore.getState().invoices;
  return filterInvoicesByCategory(invoices, category);
}

/**
 * Refresh statistics in the store using the new statistics service
 */
export function refreshStoreStatistics(): void {
  const { invoices, setStatistics } = useInvoiceStore.getState();
  const validInvoices = getValidInvoices(invoices);
  
  if (validInvoices.length > 0) {
    const extendedStats = calculateExtendedStatistics(invoices);
    // Convert extended stats to basic stats for store compatibility
    const basicStats = {
      totalAmount: extendedStats.totalAmount,
      totalInvoices: extendedStats.totalInvoices,
      averageAmount: extendedStats.averageAmount,
      dateRange: extendedStats.dateRange,
      categoryBreakdown: extendedStats.categoryBreakdown,
      timeSeriesData: extendedStats.timeSeriesData,
    };
    setStatistics(basicStats);
  } else {
    setStatistics({
      totalAmount: 0,
      totalInvoices: 0,
      averageAmount: 0,
      dateRange: { start: new Date(), end: new Date() },
      categoryBreakdown: [],
      timeSeriesData: [],
    });
  }
}

/**
 * Hook to get extended statistics with automatic updates
 */
export function useExtendedStatistics(): ExtendedStatistics | null {
  const invoices = useInvoiceStore((state) => state.invoices);
  
  if (invoices.length === 0) {
    return null;
  }
  
  return calculateExtendedStatistics(invoices);
}

/**
 * Hook to get filtered statistics based on criteria
 */
export function useFilteredStatistics(filters: {
  dateRange?: { start: Date; end: Date };
  merchant?: string;
  amountRange?: { min: number; max: number };
  category?: string;
}): ExtendedStatistics | null {
  const invoices = useInvoiceStore((state) => state.invoices);
  
  let filteredInvoices = [...invoices];
  
  // Apply filters
  if (filters.dateRange) {
    filteredInvoices = filterInvoicesByDateRange(
      filteredInvoices, 
      filters.dateRange.start, 
      filters.dateRange.end
    );
  }
  
  if (filters.merchant) {
    filteredInvoices = filterInvoicesByMerchant(filteredInvoices, filters.merchant);
  }
  
  if (filters.amountRange) {
    filteredInvoices = filterInvoicesByAmountRange(
      filteredInvoices, 
      filters.amountRange.min, 
      filters.amountRange.max
    );
  }
  
  if (filters.category) {
    filteredInvoices = filterInvoicesByCategory(filteredInvoices, filters.category);
  }
  
  if (filteredInvoices.length === 0) {
    return null;
  }
  
  return calculateExtendedStatistics(filteredInvoices);
}