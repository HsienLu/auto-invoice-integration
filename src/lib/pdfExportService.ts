import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Statistics, Invoice } from '@/types';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';

export interface PDFExportOptions {
  title?: string;
  includeCharts?: boolean;
  includeDetailedData?: boolean;
  filename?: string;
  chartElements?: HTMLElement[];
}

export interface PDFExportResult {
  success: boolean;
  error?: string;
  filename?: string;
}

/**
 * Export statistics report to PDF
 */
export async function exportStatisticsToPDF(
  statistics: Statistics,
  invoices: Invoice[],
  options: PDFExportOptions = {},
  progressId?: string
): Promise<PDFExportResult> {
  try {
    const {
      title = '發票統計報告',
      includeCharts = true,
      includeDetailedData = false,
      filename,
      chartElements = []
    } = options;

    // Update progress if tracking
    if (progressId) {
      const { updateExportProgress } = require('./exportProgressService');
      updateExportProgress(progressId, 'processing', 10, '初始化 PDF 文件...');
    }

    // Create PDF document
    const pdf = new jsPDF('p', 'mm', 'a4');
    let currentY = 20;

    if (progressId) {
      const { updateExportProgress } = require('./exportProgressService');
      updateExportProgress(progressId, 'processing', 20, '添加標題和基本資訊...');
    }

    // Add title
    pdf.setFontSize(20);
    pdf.text(title, 20, currentY);
    currentY += 15;

    // Add generation date
    pdf.setFontSize(10);
    const now = new Date();
    const dateStr = format(now, 'yyyy年MM月dd日 HH:mm', { locale: zhTW });
    pdf.text(`生成時間: ${dateStr}`, 20, currentY);
    currentY += 10;

    if (progressId) {
      const { updateExportProgress } = require('./exportProgressService');
      updateExportProgress(progressId, 'processing', 40, '添加統計摘要...');
    }

    // Add statistics summary
    currentY = await addStatisticsSummary(pdf, statistics, currentY);

    // Add charts if requested
    if (includeCharts && chartElements.length > 0) {
      if (progressId) {
        const { updateExportProgress } = require('./exportProgressService');
        updateExportProgress(progressId, 'generating', 60, '擷取圖表...');
      }
      currentY = await addChartsToPDF(pdf, chartElements, currentY);
    }

    // Add detailed data if requested
    if (includeDetailedData) {
      if (progressId) {
        const { updateExportProgress } = require('./exportProgressService');
        updateExportProgress(progressId, 'generating', 80, '添加詳細資料...');
      }
      currentY = await addDetailedDataTable(pdf, invoices, currentY);
    }

    if (progressId) {
      const { updateExportProgress } = require('./exportProgressService');
      updateExportProgress(progressId, 'generating', 95, '準備下載...');
    }

    // Generate filename
    const finalFilename = filename || generatePDFFilename();
    
    // Save PDF
    pdf.save(finalFilename);

    return {
      success: true,
      filename: finalFilename
    };
  } catch (error) {
    console.error('PDF export error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '生成PDF時發生未知錯誤'
    };
  }
}

/**
 * Add statistics summary to PDF
 */
async function addStatisticsSummary(
  pdf: jsPDF,
  statistics: Statistics,
  startY: number
): Promise<number> {
  let currentY = startY + 10;

  // Section title
  pdf.setFontSize(14);
  pdf.text('統計摘要', 20, currentY);
  currentY += 10;

  // Statistics data
  pdf.setFontSize(10);
  const summaryData = [
    ['總消費金額', `NT$ ${statistics.totalAmount.toLocaleString()}`],
    ['發票總數', `${statistics.totalInvoices} 張`],
    ['平均消費金額', `NT$ ${statistics.averageAmount.toLocaleString()}`],
    ['資料期間', `${format(statistics.dateRange.start, 'yyyy/MM/dd', { locale: zhTW })} - ${format(statistics.dateRange.end, 'yyyy/MM/dd', { locale: zhTW })}`]
  ];

  summaryData.forEach(([label, value]) => {
    pdf.text(`${label}: ${value}`, 20, currentY);
    currentY += 6;
  });

  currentY += 10;

  // Category breakdown
  if (statistics.categoryBreakdown.length > 0) {
    pdf.setFontSize(12);
    pdf.text('分類統計', 20, currentY);
    currentY += 8;

    pdf.setFontSize(9);
    statistics.categoryBreakdown.slice(0, 10).forEach((category) => {
      const text = `${category.category}: NT$ ${category.amount.toLocaleString()} (${category.percentage.toFixed(1)}%)`;
      pdf.text(text, 25, currentY);
      currentY += 5;
    });
  }

  return currentY + 10;
}

/**
 * Add charts to PDF by capturing them as images
 */
async function addChartsToPDF(
  pdf: jsPDF,
  chartElements: HTMLElement[],
  startY: number
): Promise<number> {
  let currentY = startY;

  // Section title
  pdf.setFontSize(14);
  pdf.text('圖表分析', 20, currentY);
  currentY += 10;

  for (const element of chartElements) {
    try {
      // Check if we need a new page
      if (currentY > 250) {
        pdf.addPage();
        currentY = 20;
      }

      // Capture chart as canvas
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true
      });

      // Calculate dimensions to fit in PDF
      const imgWidth = 170; // Max width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Add image to PDF
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 20, currentY, imgWidth, imgHeight);
      
      currentY += imgHeight + 10;
    } catch (error) {
      console.warn('Failed to capture chart:', error);
      // Add placeholder text instead
      pdf.setFontSize(10);
      pdf.text('圖表擷取失敗', 20, currentY);
      currentY += 10;
    }
  }

  return currentY;
}

/**
 * Add detailed data table to PDF
 */
async function addDetailedDataTable(
  pdf: jsPDF,
  invoices: Invoice[],
  startY: number
): Promise<number> {
  let currentY = startY;

  // Check if we need a new page
  if (currentY > 200) {
    pdf.addPage();
    currentY = 20;
  }

  // Section title
  pdf.setFontSize(14);
  pdf.text('詳細資料', 20, currentY);
  currentY += 10;

  // Table headers
  pdf.setFontSize(8);
  const headers = ['發票號碼', '日期', '商店', '金額'];
  const colWidths = [40, 25, 60, 25];
  let x = 20;

  headers.forEach((header, index) => {
    pdf.text(header, x, currentY);
    x += colWidths[index];
  });
  currentY += 6;

  // Draw header line
  pdf.line(20, currentY - 2, 170, currentY - 2);
  currentY += 2;

  // Add invoice data (limit to prevent overly large PDFs)
  const limitedInvoices = invoices.slice(0, 50);
  
  limitedInvoices.forEach((invoice) => {
    // Check if we need a new page
    if (currentY > 280) {
      pdf.addPage();
      currentY = 20;
    }

    x = 20;
    const rowData = [
      invoice.invoiceNumber,
      format(invoice.invoiceDate, 'MM/dd', { locale: zhTW }),
      invoice.merchantName.length > 15 ? invoice.merchantName.substring(0, 15) + '...' : invoice.merchantName,
      `$${invoice.totalAmount.toLocaleString()}`
    ];

    rowData.forEach((data, index) => {
      pdf.text(data, x, currentY);
      x += colWidths[index];
    });
    currentY += 5;
  });

  if (invoices.length > 50) {
    currentY += 5;
    pdf.setFontSize(8);
    pdf.text(`... 以及其他 ${invoices.length - 50} 筆記錄`, 20, currentY);
    currentY += 10;
  }

  return currentY;
}

/**
 * Generate default PDF filename
 */
function generatePDFFilename(): string {
  const now = new Date();
  const dateStr = format(now, 'yyyy-MM-dd_HHmm', { locale: zhTW });
  return `發票統計報告_${dateStr}.pdf`;
}

/**
 * Capture specific chart element by ID or class
 */
export function captureChartElement(selector: string): HTMLElement | null {
  const element = document.querySelector(selector) as HTMLElement;
  return element;
}

/**
 * Capture multiple chart elements
 */
export function captureChartElements(selectors: string[]): HTMLElement[] {
  const elements: HTMLElement[] = [];
  
  selectors.forEach(selector => {
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      elements.push(element);
    }
  });
  
  return elements;
}

/**
 * Validate PDF export options
 */
export function validatePDFExportOptions(options: PDFExportOptions): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate filename if provided
  if (options.filename) {
    const filename = options.filename.trim();
    if (filename.length === 0) {
      errors.push('檔案名稱不能為空');
    } else if (!/^[^<>:"/\\|?*]+$/.test(filename)) {
      errors.push('檔案名稱包含無效字元');
    }
  }

  // Validate chart elements if charts are included
  if (options.includeCharts && options.chartElements) {
    const validElements = options.chartElements.filter(el => el instanceof HTMLElement);
    if (validElements.length !== options.chartElements.length) {
      errors.push('部分圖表元素無效');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Estimate PDF generation time based on content
 */
export function estimatePDFGenerationTime(
  invoiceCount: number,
  chartCount: number,
  includeDetailedData: boolean
): { estimatedSeconds: number; warning?: string } {
  let baseTime = 2; // Base time in seconds
  
  // Add time for charts (each chart takes ~1-2 seconds to capture)
  baseTime += chartCount * 1.5;
  
  // Add time for detailed data
  if (includeDetailedData) {
    baseTime += Math.min(invoiceCount / 100, 5); // Max 5 seconds for data
  }
  
  const estimatedSeconds = Math.ceil(baseTime);
  
  let warning: string | undefined;
  if (estimatedSeconds > 10) {
    warning = '生成時間可能較長，請耐心等待';
  } else if (chartCount > 3) {
    warning = '包含多個圖表，生成時間可能稍長';
  }
  
  return { estimatedSeconds, warning };
}