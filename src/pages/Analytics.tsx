
import { useState, useEffect, memo, useCallback } from 'react';
import { Download } from 'lucide-react';
import { FilterPanel } from '@/components/FilterPanel';
import { DataTable } from '@/components/DataTable';
import { AdvancedTimeSeriesChart } from '@/components/AdvancedTimeSeriesChart';
import { AdvancedCategoryChart } from '@/components/AdvancedCategoryChart';
import { useInvoiceStore } from '@/store';
import { FilterCriteria, FilteredData } from '@/types';
import { getFilteredData, createEmptyFilters } from '@/lib/filterService';
import { Button } from '@/components/ui/button';

const Analytics = memo(function Analytics() {
  const { invoices } = useInvoiceStore();
  const [filteredData, setFilteredData] = useState<FilteredData>({
    invoices: [],
    statistics: {
      totalAmount: 0,
      totalInvoices: 0,
      averageAmount: 0,
      dateRange: { start: new Date(), end: new Date() },
      categoryBreakdown: [],
      timeSeriesData: [],
    },
  });

  // Initialize with empty filters
  useEffect(() => {
    const emptyFilters = createEmptyFilters();
    const data = getFilteredData(invoices, emptyFilters);
    setFilteredData(data);
  }, [invoices]);

  const handleFilterChange = useCallback((filters: FilterCriteria) => {
    const data = getFilteredData(invoices, filters);
    setFilteredData(data);
  }, [invoices]);

  const handleFilterReset = useCallback(() => {
    const emptyFilters = createEmptyFilters();
    const data = getFilteredData(invoices, emptyFilters);
    setFilteredData(data);
  }, [invoices]);

  const handleExportData = useCallback(() => {
    // TODO: Implement export functionality in task 9
    console.log('Export data:', filteredData.invoices);
  }, [filteredData.invoices]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold">詳細分析</h1>
        <p className="text-muted-foreground mt-2">
          深入分析您的消費數據，使用篩選器來查看特定時間範圍或商店的統計資料。
        </p>
      </div>

      {/* Filter Panel */}
      <FilterPanel 
        onFilterChange={handleFilterChange}
        onReset={handleFilterReset}
      />

      {/* Results Summary */}
      <div className="bg-card border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              篩選結果：共 <span className="font-semibold text-foreground">{filteredData.invoices.length}</span> 筆發票
            </div>
            <div className="text-sm text-muted-foreground">
              總金額：<span className="font-semibold text-foreground">${filteredData.statistics.totalAmount.toLocaleString()}</span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportData}
            className="flex items-center gap-2"
            disabled={filteredData.invoices.length === 0}
          >
            <Download className="h-4 w-4" />
            匯出資料
          </Button>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">消費趨勢分析</h3>
          <AdvancedTimeSeriesChart invoices={filteredData.invoices} />
        </div>
        
        <div className="bg-card border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">品項分類統計</h3>
          <AdvancedCategoryChart invoices={filteredData.invoices} />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-card border rounded-lg">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">詳細資料表格</h2>
          <p className="text-sm text-muted-foreground mt-1">
            可排序、分頁的詳細發票資料表格，支援欄位客製化顯示
          </p>
        </div>
        
        <div className="p-4">
          <DataTable invoices={filteredData.invoices} />
        </div>
      </div>
    </div>
  );
});

export default Analytics;