import { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  TooltipItem,

} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { format, startOfDay, eachDayOfInterval, eachMonthOfInterval, startOfMonth, endOfMonth } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { BarChart3, LineChart, Download, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Invoice } from '@/types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface AdvancedTimeSeriesChartProps {
  invoices: Invoice[];
  className?: string;
}

type ChartType = 'line' | 'bar';
type TimeRange = 'daily' | 'monthly';



export function AdvancedTimeSeriesChart({ invoices, className }: AdvancedTimeSeriesChartProps) {
  const [chartType, setChartType] = useState<ChartType>('line');
  const [timeRange, setTimeRange] = useState<TimeRange>('daily');

  // Process data based on time range
  const chartData = useMemo(() => {
    if (invoices.length === 0) return [];

    // Get date range from invoices
    const dates = invoices.map(invoice => invoice.invoiceDate);
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

    let intervals: Date[];
    let formatString: string;
    let groupKey: (date: Date) => string;

    if (timeRange === 'daily') {
      intervals = eachDayOfInterval({ start: minDate, end: maxDate });
      formatString = 'MM/dd';
      groupKey = (date: Date) => format(startOfDay(date), 'yyyy-MM-dd');
    } else {
      intervals = eachMonthOfInterval({ start: startOfMonth(minDate), end: endOfMonth(maxDate) });
      formatString = 'yyyy/MM';
      groupKey = (date: Date) => format(startOfMonth(date), 'yyyy-MM');
    }

    // Group invoices by time period
    const groupedData = new Map<string, { amount: number; count: number }>();
    
    invoices.forEach(invoice => {
      if (invoice.status !== 'issued') return;
      
      const key = groupKey(invoice.invoiceDate);
      const existing = groupedData.get(key) || { amount: 0, count: 0 };
      groupedData.set(key, {
        amount: existing.amount + invoice.totalAmount,
        count: existing.count + 1,
      });
    });

    // Create data points for all intervals
    return intervals.map(date => {
      const key = groupKey(date);
      const data = groupedData.get(key) || { amount: 0, count: 0 };
      
      return {
        date: key,
        amount: data.amount,
        count: data.count,
        formattedDate: format(date, formatString, { locale: zhTW }),
      };
    });
  }, [invoices, timeRange]);

  // Chart configuration
  const options: ChartOptions<'line' | 'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: timeRange === 'daily' ? '每日消費趨勢' : '每月消費趨勢',
      },
      tooltip: {
        callbacks: {
          title: (context: TooltipItem<'line' | 'bar'>[]) => {
            const dataIndex = context[0].dataIndex;
            return chartData[dataIndex]?.formattedDate || '';
          },
          label: (context: TooltipItem<'line' | 'bar'>) => {
            const dataIndex = context.dataIndex;
            const data = chartData[dataIndex];
            if (!data) return '';
            
            if (context.datasetIndex === 0) {
              return `消費金額: $${data.amount.toLocaleString()}`;
            } else {
              return `發票數量: ${data.count} 筆`;
            }
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: timeRange === 'daily' ? '日期' : '月份',
        },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: '消費金額 ($)',
        },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: '發票數量',
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  const data = {
    labels: chartData.map(d => d.formattedDate),
    datasets: [
      {
        label: '消費金額',
        data: chartData.map(d => d.amount),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        yAxisID: 'y',
        tension: chartType === 'line' ? 0.4 : 0,
      },
      {
        label: '發票數量',
        data: chartData.map(d => d.count),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        yAxisID: 'y1',
        tension: chartType === 'line' ? 0.4 : 0,
      },
    ],
  };

  const handleExportChart = () => {
    // TODO: Implement chart export functionality
    console.log('Export chart data:', chartData);
  };



  if (invoices.length === 0) {
    return (
      <div className={className}>
        <div className="h-80 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">無資料可顯示</p>
            <p className="text-sm">上傳發票檔案後顯示時間趨勢分析</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Chart Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="text-sm font-medium">時間範圍:</span>
            <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">每日</SelectItem>
                <SelectItem value="monthly">每月</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">圖表類型:</span>
            <Select value={chartType} onValueChange={(value: ChartType) => setChartType(value)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="line">
                  <div className="flex items-center gap-2">
                    <LineChart className="h-4 w-4" />
                    折線圖
                  </div>
                </SelectItem>
                <SelectItem value="bar">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    柱狀圖
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportChart}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          匯出圖表
        </Button>
      </div>

      {/* Chart */}
      <div className="h-80">
        {chartType === 'line' ? (
          <Line 
            data={data} 
            options={options as ChartOptions<'line'>}
          />
        ) : (
          <Bar 
            data={data} 
            options={options as ChartOptions<'bar'>}
          />
        )}
      </div>

      {/* Chart Summary */}
      <div className="mt-4 p-3 bg-muted/50 rounded-md">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">總消費:</span>
            <span className="ml-2 font-medium">
              ${chartData.reduce((sum, d) => sum + d.amount, 0).toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">總發票數:</span>
            <span className="ml-2 font-medium">
              {chartData.reduce((sum, d) => sum + d.count, 0)} 筆
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">平均每{timeRange === 'daily' ? '日' : '月'}:</span>
            <span className="ml-2 font-medium">
              ${Math.round(chartData.reduce((sum, d) => sum + d.amount, 0) / Math.max(chartData.length, 1)).toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">資料期間:</span>
            <span className="ml-2 font-medium">
              {chartData.length} {timeRange === 'daily' ? '天' : '個月'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}