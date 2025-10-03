import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Search, Filter, X } from 'lucide-react';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { FilterCriteria } from '@/types';

interface FilterPanelProps {
  onFilterChange: (filters: FilterCriteria) => void;
  onReset: () => void;
  className?: string;
}

export function FilterPanel({ onFilterChange, onReset, className }: FilterPanelProps) {
  const [filters, setFilters] = useState<FilterCriteria>({
    dateRange: {
      start: null,
      end: null,
    },
    merchantName: '',
    amountRange: {
      min: null,
      max: null,
    },
  });

  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

  // Apply filters when they change
  useEffect(() => {
    onFilterChange(filters);
  }, [filters, onFilterChange]);

  const handleDateRangeChange = (type: 'start' | 'end', date: Date | undefined) => {
    setFilters(prev => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        [type]: date || null,
      },
    }));
    
    if (type === 'start') {
      setStartDateOpen(false);
    } else {
      setEndDateOpen(false);
    }
  };

  const handleMerchantNameChange = (value: string) => {
    setFilters(prev => ({
      ...prev,
      merchantName: value,
    }));
  };

  const handleAmountRangeChange = (type: 'min' | 'max', value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    setFilters(prev => ({
      ...prev,
      amountRange: {
        ...prev.amountRange,
        [type]: numValue,
      },
    }));
  };

  const handleReset = () => {
    const resetFilters: FilterCriteria = {
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
    setFilters(resetFilters);
    onReset();
  };

  const hasActiveFilters = 
    filters.dateRange.start || 
    filters.dateRange.end || 
    filters.merchantName.trim() !== '' || 
    filters.amountRange.min !== null || 
    filters.amountRange.max !== null;

  return (
    <div className={cn("bg-card border rounded-lg p-4", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          <h2 className="text-lg font-semibold">資料篩選</h2>
        </div>
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            清除篩選
          </Button>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Date Range Filter */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">日期範圍</label>
          <div className="flex items-center gap-2">
            <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "flex-1 justify-start text-left font-normal",
                    !filters.dateRange.start && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateRange.start ? (
                    format(filters.dateRange.start, "yyyy/MM/dd", { locale: zhTW })
                  ) : (
                    "開始日期"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dateRange.start || undefined}
                  onSelect={(date) => handleDateRangeChange('start', date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            
            <span className="text-muted-foreground">至</span>
            
            <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "flex-1 justify-start text-left font-normal",
                    !filters.dateRange.end && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateRange.end ? (
                    format(filters.dateRange.end, "yyyy/MM/dd", { locale: zhTW })
                  ) : (
                    "結束日期"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dateRange.end || undefined}
                  onSelect={(date) => handleDateRangeChange('end', date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        
        {/* Merchant Name Filter */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">商店名稱</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="搜尋商店名稱..."
              value={filters.merchantName}
              onChange={(e) => handleMerchantNameChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        {/* Amount Range Filter */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">金額範圍</label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="最小金額"
              value={filters.amountRange.min?.toString() || ''}
              onChange={(e) => handleAmountRangeChange('min', e.target.value)}
              className="flex-1"
              min="0"
              step="1"
            />
            <span className="text-muted-foreground">-</span>
            <Input
              type="number"
              placeholder="最大金額"
              value={filters.amountRange.max?.toString() || ''}
              onChange={(e) => handleAmountRangeChange('max', e.target.value)}
              className="flex-1"
              min="0"
              step="1"
            />
          </div>
        </div>
      </div>
      
      {hasActiveFilters && (
        <div className="mt-4 p-3 bg-muted/50 rounded-md">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">已套用篩選條件：</span>
            <div className="mt-1 flex flex-wrap gap-2">
              {filters.dateRange.start && (
                <span className="inline-flex items-center px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                  開始：{format(filters.dateRange.start, "yyyy/MM/dd", { locale: zhTW })}
                </span>
              )}
              {filters.dateRange.end && (
                <span className="inline-flex items-center px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                  結束：{format(filters.dateRange.end, "yyyy/MM/dd", { locale: zhTW })}
                </span>
              )}
              {filters.merchantName.trim() && (
                <span className="inline-flex items-center px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                  商店：{filters.merchantName}
                </span>
              )}
              {filters.amountRange.min !== null && (
                <span className="inline-flex items-center px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                  最小金額：${filters.amountRange.min}
                </span>
              )}
              {filters.amountRange.max !== null && (
                <span className="inline-flex items-center px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                  最大金額：${filters.amountRange.max}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}