import { Invoice, Statistics, CategoryStat, TimeSeriesPoint } from '@/types';

/**
 * Advanced statistics service for invoice data processing
 * Handles consumption statistics, time series analysis, and item categorization
 */

// Extended statistics interface for more detailed analysis
export interface ExtendedStatistics extends Statistics {
  monthlyData: MonthlyStatistics[];
  topMerchants: MerchantStatistics[];
  itemFrequency: ItemFrequencyStats[];
  voidedInvoicesStats: VoidedInvoiceStats;
}

export interface MonthlyStatistics {
  year: number;
  month: number;
  totalAmount: number;
  invoiceCount: number;
  averageAmount: number;
  categoryBreakdown: CategoryStat[];
}

export interface MerchantStatistics {
  merchantName: string;
  totalAmount: number;
  invoiceCount: number;
  averageAmount: number;
  percentage: number;
}

export interface ItemFrequencyStats {
  itemName: string;
  category: string;
  frequency: number;
  totalAmount: number;
  averagePrice: number;
}

export interface VoidedInvoiceStats {
  totalVoidedInvoices: number;
  totalVoidedAmount: number;
  voidedPercentage: number;
}

/**
 * Calculate comprehensive statistics from invoice data
 */
export function calculateExtendedStatistics(invoices: Invoice[]): ExtendedStatistics {
  // Separate valid and voided invoices
  const validInvoices = invoices.filter(invoice => invoice.status === 'issued');
  const voidedInvoices = invoices.filter(invoice => invoice.status === 'voided');

  // Basic statistics
  const basicStats = calculateBasicStatistics(validInvoices);
  
  // Extended statistics
  const monthlyData = calculateMonthlyStatistics(validInvoices);
  const topMerchants = calculateMerchantStatistics(validInvoices);
  const itemFrequency = calculateItemFrequencyStats(validInvoices);
  const voidedInvoicesStats = calculateVoidedInvoiceStats(invoices, voidedInvoices);

  return {
    ...basicStats,
    monthlyData,
    topMerchants,
    itemFrequency,
    voidedInvoicesStats,
  };
}

/**
 * Calculate basic consumption statistics
 * Requirements: 2.1, 2.3
 */
export function calculateBasicStatistics(invoices: Invoice[]): Statistics {
  if (invoices.length === 0) {
    return {
      totalAmount: 0,
      totalInvoices: 0,
      averageAmount: 0,
      dateRange: {
        start: new Date(),
        end: new Date(),
      },
      categoryBreakdown: [],
      timeSeriesData: [],
    };
  }

  // Calculate total amount and count
  const totalAmount = invoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
  const totalInvoices = invoices.length;
  const averageAmount = totalAmount / totalInvoices;

  // Calculate date range
  const dates = invoices.map(invoice => invoice.invoiceDate);
  const start = new Date(Math.min(...dates.map(d => d.getTime())));
  const end = new Date(Math.max(...dates.map(d => d.getTime())));

  // Calculate category breakdown
  const categoryBreakdown = calculateCategoryBreakdown(invoices);

  // Calculate time series data
  const timeSeriesData = calculateTimeSeriesData(invoices);

  return {
    totalAmount,
    totalInvoices,
    averageAmount,
    dateRange: { start, end },
    categoryBreakdown,
    timeSeriesData,
  };
}

/**
 * Calculate category breakdown with improved categorization
 * Requirements: 4.1, 4.2
 */
export function calculateCategoryBreakdown(invoices: Invoice[]): CategoryStat[] {
  const categoryMap = new Map<string, { amount: number; count: number }>();
  
  invoices.forEach(invoice => {
    invoice.items.forEach(item => {
      const category = item.category || categorizeItemAdvanced(item.itemName);
      const existing = categoryMap.get(category) || { amount: 0, count: 0 };
      categoryMap.set(category, {
        amount: existing.amount + item.amount,
        count: existing.count + 1,
      });
    });
  });

  const totalAmount = Array.from(categoryMap.values()).reduce((sum, cat) => sum + cat.amount, 0);
  
  return Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      amount: data.amount,
      count: data.count,
      percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Calculate time series data for trend analysis
 * Requirements: 3.1, 3.2
 */
export function calculateTimeSeriesData(invoices: Invoice[]): TimeSeriesPoint[] {
  const dateMap = new Map<string, { amount: number; count: number }>();
  
  invoices.forEach(invoice => {
    const dateKey = invoice.invoiceDate.toISOString().split('T')[0]; // YYYY-MM-DD format
    const existing = dateMap.get(dateKey) || { amount: 0, count: 0 };
    dateMap.set(dateKey, {
      amount: existing.amount + invoice.totalAmount,
      count: existing.count + 1,
    });
  });

  return Array.from(dateMap.entries())
    .map(([dateStr, data]) => ({
      date: new Date(dateStr),
      amount: data.amount,
      count: data.count,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Calculate monthly statistics for trend analysis
 * Requirements: 3.1, 3.2
 */
export function calculateMonthlyStatistics(invoices: Invoice[]): MonthlyStatistics[] {
  const monthlyMap = new Map<string, Invoice[]>();
  
  // Group invoices by year-month
  invoices.forEach(invoice => {
    const date = invoice.invoiceDate;
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const existing = monthlyMap.get(monthKey) || [];
    existing.push(invoice);
    monthlyMap.set(monthKey, existing);
  });

  return Array.from(monthlyMap.entries())
    .map(([monthKey, monthInvoices]) => {
      const [year, month] = monthKey.split('-').map(Number);
      const totalAmount = monthInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
      const invoiceCount = monthInvoices.length;
      const averageAmount = totalAmount / invoiceCount;
      const categoryBreakdown = calculateCategoryBreakdown(monthInvoices);

      return {
        year,
        month,
        totalAmount,
        invoiceCount,
        averageAmount,
        categoryBreakdown,
      };
    })
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
}

/**
 * Calculate merchant statistics
 */
export function calculateMerchantStatistics(invoices: Invoice[]): MerchantStatistics[] {
  const merchantMap = new Map<string, { amount: number; count: number }>();
  
  invoices.forEach(invoice => {
    const existing = merchantMap.get(invoice.merchantName) || { amount: 0, count: 0 };
    merchantMap.set(invoice.merchantName, {
      amount: existing.amount + invoice.totalAmount,
      count: existing.count + 1,
    });
  });

  const totalAmount = Array.from(merchantMap.values()).reduce((sum, merchant) => sum + merchant.amount, 0);
  
  return Array.from(merchantMap.entries())
    .map(([merchantName, data]) => ({
      merchantName,
      totalAmount: data.amount,
      invoiceCount: data.count,
      averageAmount: data.amount / data.count,
      percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 10); // Top 10 merchants
}

/**
 * Calculate item frequency statistics
 * Requirements: 4.1, 4.2
 */
export function calculateItemFrequencyStats(invoices: Invoice[]): ItemFrequencyStats[] {
  const itemMap = new Map<string, { frequency: number; totalAmount: number; category: string }>();
  
  invoices.forEach(invoice => {
    invoice.items.forEach(item => {
      const existing = itemMap.get(item.itemName) || { 
        frequency: 0, 
        totalAmount: 0, 
        category: item.category || categorizeItemAdvanced(item.itemName) 
      };
      itemMap.set(item.itemName, {
        frequency: existing.frequency + 1,
        totalAmount: existing.totalAmount + item.amount,
        category: existing.category,
      });
    });
  });

  return Array.from(itemMap.entries())
    .map(([itemName, data]) => ({
      itemName,
      category: data.category,
      frequency: data.frequency,
      totalAmount: data.totalAmount,
      averagePrice: data.totalAmount / data.frequency,
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 50); // Top 50 most frequent items
}

/**
 * Calculate voided invoice statistics
 * Handles filtering logic for voided invoices
 */
export function calculateVoidedInvoiceStats(allInvoices: Invoice[], voidedInvoices: Invoice[]): VoidedInvoiceStats {
  const totalVoidedInvoices = voidedInvoices.length;
  const totalVoidedAmount = voidedInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const voidedPercentage = allInvoices.length > 0 ? (totalVoidedInvoices / allInvoices.length) * 100 : 0;

  return {
    totalVoidedInvoices,
    totalVoidedAmount,
    voidedPercentage,
  };
}

/**
 * Advanced item categorization with more categories
 * Requirements: 4.1, 4.2
 */
export function categorizeItemAdvanced(itemName: string): string {
  const name = itemName.toLowerCase();
  
  // Beverages
  if (name.includes('飲料') || name.includes('咖啡') || name.includes('茶') || 
      name.includes('果汁') || name.includes('汽水') || name.includes('可樂') ||
      name.includes('奶茶') || name.includes('豆漿') || name.includes('水')) {
    return '飲料';
  }
  
  // Snacks and desserts
  if (name.includes('麵包') || name.includes('蛋糕') || name.includes('餅乾') || 
      name.includes('糖果') || name.includes('巧克力') || name.includes('冰淇淋') ||
      name.includes('零食') || name.includes('洋芋片')) {
    return '點心零食';
  }
  
  // Main meals
  if (name.includes('便當') || name.includes('飯') || name.includes('麵') || 
      name.includes('湯') || name.includes('雞腿') || name.includes('排骨') ||
      name.includes('魚') || name.includes('肉') || name.includes('蛋') ||
      name.includes('菜') || name.includes('炒') || name.includes('燉')) {
    return '餐食';
  }
  
  // Fresh food
  if (name.includes('蔬菜') || name.includes('水果') || name.includes('肉類') ||
      name.includes('海鮮') || name.includes('牛奶') || name.includes('雞蛋') ||
      name.includes('豆腐') || name.includes('青菜')) {
    return '生鮮食品';
  }
  
  // Daily necessities
  if (name.includes('衛生紙') || name.includes('洗髮') || name.includes('沐浴') || 
      name.includes('牙膏') || name.includes('牙刷') || name.includes('洗衣') ||
      name.includes('清潔') || name.includes('毛巾') || name.includes('肥皂')) {
    return '日用品';
  }
  
  // Health and medicine
  if (name.includes('藥') || name.includes('維他命') || name.includes('保健') ||
      name.includes('營養') || name.includes('膠囊') || name.includes('錠')) {
    return '保健用品';
  }
  
  // Transportation
  if (name.includes('油') || name.includes('汽油') || name.includes('停車') ||
      name.includes('過路費') || name.includes('捷運') || name.includes('公車') ||
      name.includes('計程車') || name.includes('機車')) {
    return '交通';
  }
  
  // Clothing
  if (name.includes('衣') || name.includes('褲') || name.includes('鞋') ||
      name.includes('襪') || name.includes('帽') || name.includes('包')) {
    return '服飾';
  }
  
  // Electronics
  if (name.includes('手機') || name.includes('電腦') || name.includes('充電') ||
      name.includes('耳機') || name.includes('電池') || name.includes('3C')) {
    return '3C電子';
  }
  
  // Books and stationery
  if (name.includes('書') || name.includes('筆') || name.includes('紙') ||
      name.includes('文具') || name.includes('雜誌') || name.includes('報紙')) {
    return '文具書籍';
  }
  
  // Default category
  return '其他';
}

/**
 * Filter invoices by date range
 */
export function filterInvoicesByDateRange(invoices: Invoice[], startDate: Date, endDate: Date): Invoice[] {
  return invoices.filter(invoice => {
    const invoiceDate = invoice.invoiceDate;
    return invoiceDate >= startDate && invoiceDate <= endDate;
  });
}

/**
 * Filter invoices by merchant name
 */
export function filterInvoicesByMerchant(invoices: Invoice[], merchantName: string): Invoice[] {
  const searchTerm = merchantName.toLowerCase();
  return invoices.filter(invoice => 
    invoice.merchantName.toLowerCase().includes(searchTerm)
  );
}

/**
 * Filter invoices by amount range
 */
export function filterInvoicesByAmountRange(invoices: Invoice[], minAmount: number, maxAmount: number): Invoice[] {
  return invoices.filter(invoice => 
    invoice.totalAmount >= minAmount && invoice.totalAmount <= maxAmount
  );
}

/**
 * Filter invoices by category
 */
export function filterInvoicesByCategory(invoices: Invoice[], category: string): Invoice[] {
  return invoices.filter(invoice => 
    invoice.items.some(item => 
      (item.category || categorizeItemAdvanced(item.itemName)) === category
    )
  );
}

/**
 * Get invoices excluding voided ones
 * Requirements: Handle voided invoice filtering logic
 */
export function getValidInvoices(invoices: Invoice[]): Invoice[] {
  return invoices.filter(invoice => invoice.status === 'issued');
}

/**
 * Get only voided invoices
 */
export function getVoidedInvoices(invoices: Invoice[]): Invoice[] {
  return invoices.filter(invoice => invoice.status === 'voided');
}