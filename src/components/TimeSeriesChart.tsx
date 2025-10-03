import { useMemo, useState, memo, useCallback } from 'react';
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
import { ChartSkeleton } from './LoadingStates';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useInvoiceStore } from '@/store';
import { TrendingUp, BarChart3 } from 'lucide-react';

// Register Chart.js components
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

interface TimeSeriesChartProps {
  className?: string;
}

type ChartType = 'daily' | 'monthly';

export const TimeSeriesChart = memo(function TimeSeriesChart({ className }: TimeSeriesChartProps) {
  const { statistics, isLoading } = useInvoiceStore();
  const [chartType, setChartType] = useState<ChartType>('daily');

  // Process data for daily trend
  const dailyData = useMemo(() => {
    if (!statistics?.timeSeriesData) return null;

    const sortedData = [...statistics.timeSeriesData].sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );

    return {
      labels: sortedData.map(point => 
        point.date.toLocaleDateString('zh-TW', { 
          month: 'short', 
          day: 'numeric' 
        })
      ),
      datasets: [
        {
          label: '每日消費金額',
          data: sortedData.map(point => point.amount),
          borderColor: 'hsl(var(--primary))',
          backgroundColor: 'hsl(var(--primary) / 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: 'hsl(var(--primary))',
          pointBorderColor: 'hsl(var(--background))',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
      rawData: sortedData,
    };
  }, [statistics]);

  // Process data for monthly trend
  const monthlyData = useMemo(() => {
    if (!statistics?.timeSeriesData) return null;

    // Group by month
    const monthlyMap = new Map<string, { amount: number; count: number }>();
    
    statistics.timeSeriesData.forEach(point => {
      const monthKey = `${point.date.getFullYear()}-${point.date.getMonth()}`;
      const existing = monthlyMap.get(monthKey) || { amount: 0, count: 0 };
      monthlyMap.set(monthKey, {
        amount: existing.amount + point.amount,
        count: existing.count + point.count,
      });
    });

    const sortedMonthly = Array.from(monthlyMap.entries())
      .map(([key, data]) => {
        const [year, month] = key.split('-').map(Number);
        return {
          date: new Date(year, month),
          amount: data.amount,
          count: data.count,
        };
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    return {
      labels: sortedMonthly.map(point => 
        point.date.toLocaleDateString('zh-TW', { 
          year: 'numeric', 
          month: 'short' 
        })
      ),
      datasets: [
        {
          label: '每月消費金額',
          data: sortedMonthly.map(point => point.amount),
          backgroundColor: 'hsl(var(--primary) / 0.8)',
          borderColor: 'hsl(var(--primary))',
          borderWidth: 1,
          borderRadius: 4,
          borderSkipped: false,
        },
      ],
      rawData: sortedMonthly,
    };
  }, [statistics]);

  // Memoized click handlers to prevent unnecessary re-renders
  const handleDailyChartClick = useCallback((_event: any, elements: any[]) => {
    if (elements.length > 0) {
      const dataIndex = elements[0].index;
      const rawData = dailyData?.rawData[dataIndex];
      if (rawData) {
        // TODO: Navigate to detailed view or show invoice list for this date
        console.log('Clicked on date:', rawData.date, 'Amount:', rawData.amount);
      }
    }
  }, [dailyData]);

  const handleMonthlyChartClick = useCallback((_event: any, elements: any[]) => {
    if (elements.length > 0) {
      const dataIndex = elements[0].index;
      const rawData = monthlyData?.rawData[dataIndex];
      if (rawData) {
        // TODO: Navigate to detailed view or show invoice list for this month
        console.log('Clicked on month:', rawData.date, 'Amount:', rawData.amount);
      }
    }
  }, [monthlyData]);

  // Chart options for line chart - memoized to prevent recreation
  const lineOptions: ChartOptions<'line'> = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'hsl(var(--popover))',
        titleColor: 'hsl(var(--popover-foreground))',
        bodyColor: 'hsl(var(--popover-foreground))',
        borderColor: 'hsl(var(--border))',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          title: (context: TooltipItem<'line'>[]) => {
            const dataIndex = context[0].dataIndex;
            const rawData = dailyData?.rawData[dataIndex];
            if (rawData) {
              return rawData.date.toLocaleDateString('zh-TW', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'short',
              });
            }
            return '';
          },
          label: (context: TooltipItem<'line'>) => {
            const value = context.parsed.y;
            const dataIndex = context.dataIndex;
            const rawData = dailyData?.rawData[dataIndex];
            const count = rawData?.count || 0;
            
            return [
              `消費金額: ${new Intl.NumberFormat('zh-TW', {
                style: 'currency',
                currency: 'TWD',
                minimumFractionDigits: 0,
              }).format(value)}`,
              `發票數量: ${count} 張`,
            ];
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          color: 'hsl(var(--muted-foreground))',
        },
      },
      y: {
        grid: {
          color: 'hsl(var(--border))',
        },
        border: {
          display: false,
        },
        ticks: {
          color: 'hsl(var(--muted-foreground))',
          callback: function(value) {
            return new Intl.NumberFormat('zh-TW', {
              style: 'currency',
              currency: 'TWD',
              minimumFractionDigits: 0,
            }).format(value as number);
          },
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
    onClick: handleDailyChartClick,
  }), [dailyData, handleDailyChartClick]);

  // Chart options for bar chart - memoized to prevent recreation
  const barOptions: ChartOptions<'bar'> = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'hsl(var(--popover))',
        titleColor: 'hsl(var(--popover-foreground))',
        bodyColor: 'hsl(var(--popover-foreground))',
        borderColor: 'hsl(var(--border))',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          title: (context: TooltipItem<'bar'>[]) => {
            return context[0].label;
          },
          label: (context: TooltipItem<'bar'>) => {
            const value = context.parsed.y;
            const dataIndex = context.dataIndex;
            const rawData = monthlyData?.rawData[dataIndex];
            const count = rawData?.count || 0;
            
            return [
              `消費金額: ${new Intl.NumberFormat('zh-TW', {
                style: 'currency',
                currency: 'TWD',
                minimumFractionDigits: 0,
              }).format(value)}`,
              `發票數量: ${count} 張`,
            ];
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          color: 'hsl(var(--muted-foreground))',
        },
      },
      y: {
        grid: {
          color: 'hsl(var(--border))',
        },
        border: {
          display: false,
        },
        ticks: {
          color: 'hsl(var(--muted-foreground))',
          callback: function(value) {
            return new Intl.NumberFormat('zh-TW', {
              style: 'currency',
              currency: 'TWD',
              minimumFractionDigits: 0,
            }).format(value as number);
          },
        },
      },
    },
    onClick: handleMonthlyChartClick,
  }), [monthlyData, handleMonthlyChartClick]);

  // Loading state
  if (isLoading) {
    return <ChartSkeleton className={className} />;
  }

  // No data state
  if (!statistics || (!dailyData && !monthlyData)) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            消費趨勢
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>上傳檔案後顯示圖表</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentData = chartType === 'daily' ? dailyData : monthlyData;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            消費趨勢
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant={chartType === 'daily' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('daily')}
            >
              每日
            </Button>
            <Button
              variant={chartType === 'monthly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('monthly')}
            >
              每月
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          {currentData && (
            <>
              {chartType === 'daily' ? (
                <Line data={currentData} options={lineOptions} />
              ) : (
                <Bar data={currentData} options={barOptions} />
              )}
            </>
          )}
        </div>
        {currentData && (
          <div className="mt-4 text-sm text-muted-foreground text-center">
            點擊圖表上的數據點查看詳細資訊
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export default TimeSeriesChart;