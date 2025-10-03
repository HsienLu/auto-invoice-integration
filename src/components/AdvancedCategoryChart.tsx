import { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  TooltipItem,

} from 'chart.js';
import { Pie, Doughnut, Bar } from 'react-chartjs-2';
import { PieChart, Download, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Invoice } from '@/types';

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface AdvancedCategoryChartProps {
  invoices: Invoice[];
  className?: string;
}

type ChartType = 'pie' | 'doughnut' | 'bar';
type DataType = 'amount' | 'count';

interface CategoryData {
  category: string;
  amount: number;
  count: number;
  percentage: number;
  items: string[];
}

// Predefined colors for categories
const CATEGORY_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#84CC16', // Lime
  '#EC4899', // Pink
  '#6B7280', // Gray
];

export function AdvancedCategoryChart({ invoices, className }: AdvancedCategoryChartProps) {
  const [chartType, setChartType] = useState<ChartType>('doughnut');
  const [dataType, setDataType] = useState<DataType>('amount');
  const [minPercentage, setMinPercentage] = useState<number>(1);

  // Process category data
  const categoryData = useMemo(() => {
    if (invoices.length === 0) return [];

    const categoryMap = new Map<string, { amount: number; count: number; items: Set<string> }>();
    let totalAmount = 0;
    let totalCount = 0;

    // Aggregate data by category
    invoices.forEach(invoice => {
      if (invoice.status !== 'issued') return;

      invoice.items.forEach(item => {
        const category = item.category || '其他';
        const existing = categoryMap.get(category) || { amount: 0, count: 0, items: new Set() };
        
        existing.amount += item.amount;
        existing.count += 1;
        existing.items.add(item.itemName);
        
        categoryMap.set(category, existing);
        totalAmount += item.amount;
        totalCount += 1;
      });
    });

    // Convert to array and calculate percentages
    const categories: CategoryData[] = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      amount: data.amount,
      count: data.count,
      percentage: dataType === 'amount' 
        ? (data.amount / totalAmount) * 100 
        : (data.count / totalCount) * 100,
      items: Array.from(data.items),
    }));

    // Sort by the selected data type
    categories.sort((a, b) => {
      return dataType === 'amount' ? b.amount - a.amount : b.count - a.count;
    });

    // Filter by minimum percentage and group small categories
    const filteredCategories = categories.filter(cat => cat.percentage >= minPercentage);
    const smallCategories = categories.filter(cat => cat.percentage < minPercentage);

    if (smallCategories.length > 0) {
      const otherCategory: CategoryData = {
        category: '其他 (小分類)',
        amount: smallCategories.reduce((sum, cat) => sum + cat.amount, 0),
        count: smallCategories.reduce((sum, cat) => sum + cat.count, 0),
        percentage: smallCategories.reduce((sum, cat) => sum + cat.percentage, 0),
        items: smallCategories.flatMap(cat => cat.items),
      };
      filteredCategories.push(otherCategory);
    }

    return filteredCategories;
  }, [invoices, dataType, minPercentage]);

  // Chart configuration
  const options: ChartOptions<'pie' | 'doughnut' | 'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: chartType === 'bar' ? 'top' : 'right',
        labels: {
          generateLabels: (chart) => {
            const data = chart.data;
            if (data.labels && data.datasets[0]) {
              return data.labels.map((label, i) => {
                const category = categoryData[i];
                const backgroundColor = Array.isArray(data.datasets[0].backgroundColor) 
                  ? data.datasets[0].backgroundColor[i] as string
                  : data.datasets[0].backgroundColor as string;
                const borderColor = Array.isArray(data.datasets[0].borderColor)
                  ? data.datasets[0].borderColor[i] as string
                  : data.datasets[0].borderColor as string;
                return {
                  text: `${label} (${category?.percentage.toFixed(1)}%)`,
                  fillStyle: backgroundColor,
                  strokeStyle: borderColor,
                  lineWidth: 1,
                  hidden: false,
                  index: i,
                };
              });
            }
            return [];
          },
        },
      },
      title: {
        display: true,
        text: `品項分類統計 (依${dataType === 'amount' ? '金額' : '數量'})`,
      },
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<'pie' | 'doughnut' | 'bar'>) => {
            const dataIndex = context.dataIndex;
            const category = categoryData[dataIndex];
            if (!category) return '';
            
            const lines = [
              `${category.category}`,
              `金額: $${category.amount.toLocaleString()}`,
              `數量: ${category.count} 筆`,
              `佔比: ${category.percentage.toFixed(1)}%`,
            ];
            
            if (category.items.length <= 5) {
              lines.push(`品項: ${category.items.join(', ')}`);
            } else {
              lines.push(`品項: ${category.items.slice(0, 3).join(', ')} 等 ${category.items.length} 項`);
            }
            
            return lines;
          },
        },
      },
    },
    ...(chartType === 'bar' && {
      scales: {
        x: {
          title: {
            display: true,
            text: '分類',
          },
        },
        y: {
          title: {
            display: true,
            text: dataType === 'amount' ? '金額 ($)' : '數量',
          },
        },
      },
    }),
  };

  const data = {
    labels: categoryData.map(cat => cat.category),
    datasets: [
      {
        label: dataType === 'amount' ? '消費金額' : '購買數量',
        data: categoryData.map(cat => dataType === 'amount' ? cat.amount : cat.count),
        backgroundColor: categoryData.map((_, index) => CATEGORY_COLORS[index % CATEGORY_COLORS.length]),
        borderColor: categoryData.map((_, index) => CATEGORY_COLORS[index % CATEGORY_COLORS.length]),
        borderWidth: 1,
      },
    ],
  };

  const handleExportChart = () => {
    // TODO: Implement chart export functionality
    console.log('Export category data:', categoryData);
  };



  if (invoices.length === 0) {
    return (
      <div className={className}>
        <div className="h-80 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <PieChart className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">無資料可顯示</p>
            <p className="text-sm">上傳發票檔案後顯示品項分類分析</p>
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
            <span className="text-sm font-medium">圖表類型:</span>
            <Select value={chartType} onValueChange={(value: ChartType) => setChartType(value)}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pie">圓餅圖</SelectItem>
                <SelectItem value="doughnut">甜甜圈圖</SelectItem>
                <SelectItem value="bar">柱狀圖</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">統計依據:</span>
            <Select value={dataType} onValueChange={(value: DataType) => setDataType(value)}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="amount">金額</SelectItem>
                <SelectItem value="count">數量</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span className="text-sm font-medium">最小佔比:</span>
            <Select value={minPercentage.toString()} onValueChange={(value) => setMinPercentage(parseInt(value))}>
              <SelectTrigger className="w-16">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">0%</SelectItem>
                <SelectItem value="1">1%</SelectItem>
                <SelectItem value="2">2%</SelectItem>
                <SelectItem value="5">5%</SelectItem>
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
        {chartType === 'pie' && (
          <Pie 
            data={data} 
            options={options as ChartOptions<'pie'>}
          />
        )}
        {chartType === 'doughnut' && (
          <Doughnut 
            data={data} 
            options={options as ChartOptions<'doughnut'>}
          />
        )}
        {chartType === 'bar' && (
          <Bar 
            data={data} 
            options={options as ChartOptions<'bar'>}
          />
        )}
      </div>

      {/* Category Summary */}
      <div className="mt-4 space-y-3">
        <h4 className="text-sm font-medium">分類詳情</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {categoryData.slice(0, 8).map((category, index) => (
            <div key={category.category} className="flex items-center justify-between p-2 bg-muted/30 rounded">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
                />
                <span className="text-sm font-medium">{category.category}</span>
                <Badge variant="outline" className="text-xs">
                  {category.percentage.toFixed(1)}%
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                {dataType === 'amount' 
                  ? `$${category.amount.toLocaleString()}`
                  : `${category.count} 筆`
                }
              </div>
            </div>
          ))}
        </div>
        {categoryData.length > 8 && (
          <p className="text-xs text-muted-foreground text-center">
            還有 {categoryData.length - 8} 個分類未顯示
          </p>
        )}
      </div>
    </div>
  );
}