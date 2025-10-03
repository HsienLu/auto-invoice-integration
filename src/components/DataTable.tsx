import { useState, useMemo } from 'react';
import { 
  ChevronUp, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Invoice } from '@/types';

// Column definition interface
export interface ColumnDef {
  key: string;
  label: string;
  sortable?: boolean;
  visible?: boolean;
  width?: string;
  render?: (value: any, row: TableRow) => React.ReactNode;
}

// Table row interface (flattened invoice + item data)
export interface TableRow {
  id: string;
  invoiceNumber: string;
  invoiceDate: Date;
  merchantName: string;
  merchantId: string;
  totalAmount: number;
  status: 'issued' | 'voided';
  itemName?: string;
  itemAmount?: number;
  itemCategory?: string;
  carrierType: string;
  carrierNumber: string;
}

// Sort configuration
interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

interface DataTableProps {
  invoices: Invoice[];
  className?: string;
}

export function DataTable({ invoices, className }: DataTableProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'invoiceDate', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({
    invoiceNumber: true,
    invoiceDate: true,
    merchantName: true,
    totalAmount: true,
    status: true,
    itemName: true,
    itemAmount: true,
    itemCategory: true,
    carrierType: false,
    carrierNumber: false,
    merchantId: false,
  });

  // Define columns
  const columns: ColumnDef[] = [
    {
      key: 'invoiceNumber',
      label: '發票號碼',
      sortable: true,
      visible: columnVisibility.invoiceNumber,
      width: 'w-32',
    },
    {
      key: 'invoiceDate',
      label: '發票日期',
      sortable: true,
      visible: columnVisibility.invoiceDate,
      width: 'w-28',
      render: (value: Date) => format(value, 'yyyy/MM/dd', { locale: zhTW }),
    },
    {
      key: 'merchantName',
      label: '商店名稱',
      sortable: true,
      visible: columnVisibility.merchantName,
      width: 'w-40',
    },
    {
      key: 'totalAmount',
      label: '發票金額',
      sortable: true,
      visible: columnVisibility.totalAmount,
      width: 'w-24',
      render: (value: number) => `$${value.toLocaleString()}`,
    },
    {
      key: 'status',
      label: '狀態',
      sortable: true,
      visible: columnVisibility.status,
      width: 'w-20',
      render: (value: string) => (
        <Badge variant={value === 'issued' ? 'default' : 'destructive'}>
          {value === 'issued' ? '正常' : '作廢'}
        </Badge>
      ),
    },
    {
      key: 'itemName',
      label: '品項名稱',
      sortable: true,
      visible: columnVisibility.itemName,
      width: 'w-48',
    },
    {
      key: 'itemAmount',
      label: '品項金額',
      sortable: true,
      visible: columnVisibility.itemAmount,
      width: 'w-24',
      render: (value: number | undefined) => value ? `$${value.toLocaleString()}` : '-',
    },
    {
      key: 'itemCategory',
      label: '品項分類',
      sortable: true,
      visible: columnVisibility.itemCategory,
      width: 'w-24',
      render: (value: string | undefined) => value ? (
        <Badge variant="outline">{value}</Badge>
      ) : '-',
    },
    {
      key: 'carrierType',
      label: '載具類型',
      sortable: true,
      visible: columnVisibility.carrierType,
      width: 'w-24',
    },
    {
      key: 'carrierNumber',
      label: '載具號碼',
      sortable: true,
      visible: columnVisibility.carrierNumber,
      width: 'w-32',
    },
    {
      key: 'merchantId',
      label: '商店統編',
      sortable: true,
      visible: columnVisibility.merchantId,
      width: 'w-28',
    },
  ];

  // Flatten invoices into table rows (one row per item, or one row per invoice if no items)
  const tableData = useMemo(() => {
    const rows: TableRow[] = [];
    
    invoices.forEach(invoice => {
      if (invoice.items && invoice.items.length > 0) {
        // Create one row per item
        invoice.items.forEach(item => {
          rows.push({
            id: `${invoice.id}-${item.id}`,
            invoiceNumber: invoice.invoiceNumber,
            invoiceDate: invoice.invoiceDate,
            merchantName: invoice.merchantName,
            merchantId: invoice.merchantId,
            totalAmount: invoice.totalAmount,
            status: invoice.status,
            itemName: item.itemName,
            itemAmount: item.amount,
            itemCategory: item.category,
            carrierType: invoice.carrierType,
            carrierNumber: invoice.carrierNumber,
          });
        });
      } else {
        // Create one row for invoice without items
        rows.push({
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: invoice.invoiceDate,
          merchantName: invoice.merchantName,
          merchantId: invoice.merchantId,
          totalAmount: invoice.totalAmount,
          status: invoice.status,
          carrierType: invoice.carrierType,
          carrierNumber: invoice.carrierNumber,
        });
      }
    });
    
    return rows;
  }, [invoices]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return tableData;
    
    return [...tableData].sort((a, b) => {
      const aValue = a[sortConfig.key as keyof TableRow];
      const bValue = b[sortConfig.key as keyof TableRow];
      
      if (aValue === undefined && bValue === undefined) return 0;
      if (aValue === undefined) return 1;
      if (bValue === undefined) return -1;
      
      let comparison = 0;
      
      if (aValue instanceof Date && bValue instanceof Date) {
        comparison = aValue.getTime() - bValue.getTime();
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(String(bValue), 'zh-TW');
      }
      
      return sortConfig.direction === 'desc' ? -comparison : comparison;
    });
  }, [tableData, sortConfig]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize]);

  // Calculate pagination info
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, sortedData.length);

  // Handle sorting
  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Handle column visibility toggle
  const toggleColumnVisibility = (key: string) => {
    setColumnVisibility(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Get visible columns
  const visibleColumns = columns.filter(col => col.visible);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Table Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">每頁顯示</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => {
                setPageSize(parseInt(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">筆</span>
          </div>
          
          <div className="text-sm text-muted-foreground">
            顯示第 {startItem} - {endItem} 筆，共 {sortedData.length} 筆
          </div>
        </div>

        {/* Column Visibility Control */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              欄位設定
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56" align="end">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">顯示欄位</h4>
              {columns.map(column => (
                <div key={column.key} className="flex items-center justify-between">
                  <span className="text-sm">{column.label}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleColumnVisibility(column.key)}
                    className="h-6 w-6 p-0"
                  >
                    {column.visible ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {visibleColumns.map(column => (
                  <TableHead 
                    key={column.key} 
                    className={cn(column.width, column.sortable && "cursor-pointer hover:bg-muted/50")}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    <div className="flex items-center gap-2">
                      {column.label}
                      {column.sortable && (
                        <div className="flex flex-col">
                          <ChevronUp 
                            className={cn(
                              "h-3 w-3",
                              sortConfig.key === column.key && sortConfig.direction === 'asc'
                                ? "text-foreground" 
                                : "text-muted-foreground"
                            )} 
                          />
                          <ChevronDown 
                            className={cn(
                              "h-3 w-3 -mt-1",
                              sortConfig.key === column.key && sortConfig.direction === 'desc'
                                ? "text-foreground" 
                                : "text-muted-foreground"
                            )} 
                          />
                        </div>
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length > 0 ? (
                paginatedData.map(row => (
                  <TableRow key={row.id}>
                    {visibleColumns.map(column => (
                      <TableCell key={column.key} className={column.width}>
                        {column.render 
                          ? column.render(row[column.key as keyof TableRow], row)
                          : String(row[column.key as keyof TableRow] || '-')
                        }
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={visibleColumns.length} className="text-center py-12">
                    <div className="text-muted-foreground">
                      <p className="text-lg font-medium">無資料可顯示</p>
                      <p className="text-sm mt-1">請調整篩選條件或上傳發票檔案</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            第 {currentPage} 頁，共 {totalPages} 頁
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}