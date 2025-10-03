import { useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  TooltipItem,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useInvoiceStore } from '@/store';
import { ChartSkeleton } from './LoadingStates';
import { PieChart, BarChart3 } from 'lucide-react';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface CategoryChartProps {
  className?: string;
}

type ChartType = 'doughnut' | 'bar' | 'frequency';

// Color palette for categories
const CATEGORY_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(220, 70%, 50%)',
  'hsl(280, 70%, 50%)',
  'hsl(340, 70%, 50%)',
  'hsl(40, 70%, 50%)',
  'hsl(120, 70%, 50%)',
  'hsl(180, 70%, 50%)',
  'hsl(200, 70%, 50%)',
  'hsl(260, 70%, 50%)',
];

export function CategoryChart({ className }: CategoryChartProps) {
  const { statistics, invoices, isLoading } = useInvoiceStore();
  const [chartType, setChartType] = useState<ChartType>('doughnut');

  // Calculate item frequency data
  const itemFrequencyData = useMemo(() => {
    if (!invoices.length) return null;

    const validInvoices = invoices.filter(inv => inv.status === 'issued');
    const itemFrequency = new Map<string, { count: number; totalAmount: number; category: string }>();

    validInvoices.forEach(invoice => {
      invoice.items.forEach(item => {
        const existing = itemFrequency.get(item.itemName) || { 
          count: 0, 
          totalAmount: 0, 
          category: item.category || '其他' 
        };
        itemFrequency.set(item.itemName, {
          count: existing.count + 1,
          totalAmount: existing.totalAmount + item.amount,
          category: item.category || '其他',
        });
      });
    });

    // Get top 10 most frequent items
    const sortedItems = Array.from(itemFrequency.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10);

    return {
      labels: sortedItems.map(([itemName]) => itemName),
      datasets: [
        {
          label: '購買次數',
          data: sortedItems.map(([, data]) => data.count),
          backgroundColor: CATEGORY_COLORS.slice(0, sortedItems.length),
          borderColor: CATEGORY_COLORS.slice(0, sortedItems.length),
          borderWidth: 1,
          borderRadius: 4,
          borderSkipped: false,
        },
      ],
      rawData: sortedItems.map(([itemName, data]) => ({
        itemName,
        ...data,
      })),
    };
  }, [invoices]);

  // Process category data for doughnut chart
  const doughnutData = useMemo(() => {
    if (!statistics?.categoryBreakdown) return null;

    const topCategories = statistics.categoryBreakdown.slice(0, 8);
    
    return {
      labels: topCategories.map(cat => cat.category),
      datasets: [
        {
          data: topCategories.map(cat => cat.amount),
          backgroundColor: CATEGORY_COLORS.slice(0, topCategories.length),
          borderColor: 'hsl(var(--background))',
          borderWidth: 2,
          hoverBorderWidth: 3,
        },
      ],
      rawData: topCategories,
    };
  }, [statistics]);

  // Process category data for bar chart
  const barData = useMemo(() => {
    if (!statistics?.categoryBreakdown) return null;

    const topCategories = statistics.categoryBreakdown.slice(0, 8);
    
    return {
      labels: topCategories.map(cat => cat.category),
      datasets: [
        {
          label: '消費金額',
          data: topCategories.map(cat => cat.amount),
          backgroundColor: CATEGORY_COLORS.slice(0, topCategories.length).map(color => 
            color.replace(')', ' / 0.8)')
          ),
          borderColor: CATEGORY_COLORS.slice(0, topCategories.length),
          borderWidth: 1,
          borderRadius: 4,
          borderSkipped: false,
        },
      ],
      rawData: topCategories,
    };
  }, [statistics]);

  // Doughnut chart options
  const doughnutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: 'hsl(var(--foreground))',
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: 'hsl(var(--popover))',
        titleColor: 'hsl(var(--popover-foreground))',
        bodyColor: 'hsl(var(--popover-foreground))',
        borderColor: 'hsl(var(--border))',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: (context: TooltipItem<'doughnut'>) => {
            const dataIndex = context.dataIndex;
            const rawData = doughnutData?.rawData[dataIndex];
            if (rawData) {
              return [
                `${rawData.category}`,
                `金額: ${new Intl.NumberFormat('zh-TW', {
                  style: 'currency',
                  currency: 'TWD',
                  minimumFractionDigits: 0,
                }).format(rawData.amount)}`,
                `佔比: ${rawData.percentage.toFixed(1)}%`,
                `發票數: ${rawData.count} 張`,
              ];
            }
            return '';
          },
        },
      },
    },
    onClick: (_event, elements) => {
      if (elements.length > 0) {
        const dataIndex = elements[0].index;
        const rawData = doughnutData?.rawData[dataIndex];
        if (rawData) {
          // TODO: Navigate to detailed view or filter by category
          console.log('Clicked on category:', rawData.category, 'Amount:', rawData.amount);
        }
      }
    },
  };

  // Bar chart options
  const barOptions: ChartOptions<'bar'> = {
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
            const dataIndex = context.dataIndex;
            const rawData = barData?.rawData[dataIndex];
            if (rawData) {
              return [
                `金額: ${new Intl.NumberFormat('zh-TW', {
                  style: 'currency',
                  currency: 'TWD',
                  minimumFractionDigits: 0,
                }).format(rawData.amount)}`,
                `佔比: ${rawData.percentage.toFixed(1)}%`,
                `發票數: ${rawData.count} 張`,
              ];
            }
            return '';
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
          maxRotation: 45,
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
    onClick: (_event, elements) => {
      if (elements.length > 0) {
        const dataIndex = elements[0].index;
        const rawData = barData?.rawData[dataIndex];
        if (rawData) {
          // TODO: Navigate to detailed view or filter by category
          console.log('Clicked on category:', rawData.category, 'Amount:', rawData.amount);
        }
      }
    },
  };

  // Frequency chart options
  const frequencyOptions: ChartOptions<'bar'> = {
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
            const dataIndex = context.dataIndex;
            const rawData = itemFrequencyData?.rawData[dataIndex];
            if (rawData) {
              return [
                `購買次數: ${rawData.count} 次`,
                `總金額: ${new Intl.NumberFormat('zh-TW', {
                  style: 'currency',
                  currency: 'TWD',
                  minimumFractionDigits: 0,
                }).format(rawData.totalAmount)}`,
                `平均價格: ${new Intl.NumberFormat('zh-TW', {
                  style: 'currency',
                  currency: 'TWD',
                  minimumFractionDigits: 0,
                }).format(rawData.totalAmount / rawData.count)}`,
                `分類: ${rawData.category}`,
              ];
            }
            return '';
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
          maxRotation: 45,
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
          stepSize: 1,
        },
      },
    },
    onClick: (_event, elements) => {
      if (elements.length > 0) {
        const dataIndex = elements[0].index;
        const rawData = itemFrequencyData?.rawData[dataIndex];
        if (rawData) {
          // TODO: Navigate to detailed view or filter by item
          console.log('Clicked on item:', rawData.itemName, 'Count:', rawData.count);
        }
      }
    },
  };

  // Loading state
  if (isLoading) {
    return <ChartSkeleton className={className} />;
  }

  // No data state
  if (!statistics?.categoryBreakdown?.length && !itemFrequencyData) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            品項分析
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

  const getCurrentData = () => {
    switch (chartType) {
      case 'doughnut':
        return doughnutData;
      case 'bar':
        return barData;
      case 'frequency':
        return itemFrequencyData;
      default:
        return doughnutData;
    }
  };

  const currentData = getCurrentData();

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            品項分析
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant={chartType === 'doughnut' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('doughnut')}
            >
              分類佔比
            </Button>
            <Button
              variant={chartType === 'bar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('bar')}
            >
              分類金額
            </Button>
            <Button
              variant={chartType === 'frequency' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('frequency')}
            >
              購買頻率
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          {currentData && (
            <>
              {chartType === 'doughnut' && doughnutData && (
                <Doughnut data={doughnutData} options={doughnutOptions} />
              )}
              {chartType === 'bar' && barData && (
                <Bar data={barData} options={barOptions} />
              )}
              {chartType === 'frequency' && itemFrequencyData && (
                <Bar data={itemFrequencyData} options={frequencyOptions} />
              )}
            </>
          )}
        </div>
        {currentData && (
          <div className="mt-4 text-sm text-muted-foreground text-center">
            點擊圖表上的數據查看詳細資訊
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CategoryChart;