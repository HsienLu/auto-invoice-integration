import { describe, expect, it } from 'vitest';

import { parseInvoiceCSV } from '@/lib/csvParser';

const createCsvFile = (content: string) => {
  const blob = new Blob([content], { type: 'text/csv' });
  return new File([blob], 'test.csv', { type: 'text/csv' });
};

describe('csvParser - D line formats', () => {
  it('parses amount before item name (Taiwan e-invoice download format)', async () => {
    const csvContent = [
      'M,手機條碼,/TEST,2024-09-01,12345678,測試商店,AB12345678,137,開立',
      'D,AB12345678,137,路易莎咖啡餐點類',
    ].join('\n');

    const result = await parseInvoiceCSV(createCsvFile(csvContent));

    expect(result.success).toBe(true);
    expect(result.invoices).toHaveLength(1);
    expect(result.invoices[0].items).toHaveLength(1);
    expect(result.invoices[0].items[0]).toMatchObject({
      invoiceNumber: 'AB12345678',
      itemName: '路易莎咖啡餐點類',
      amount: 137,
    });
  });

  it('parses legacy format where item name comes before amount', async () => {
    const csvContent = [
      'M,手機條碼,/TEST,2024-09-01,12345678,測試商店,AB12345679,200,開立',
      'D,AB12345679,測試商品,200',
    ].join('\n');

    const result = await parseInvoiceCSV(createCsvFile(csvContent));

    expect(result.success).toBe(true);
    expect(result.invoices).toHaveLength(1);
    expect(result.invoices[0].items).toHaveLength(1);
    expect(result.invoices[0].items[0]).toMatchObject({
      invoiceNumber: 'AB12345679',
      itemName: '測試商品',
      amount: 200,
    });
  });
});
