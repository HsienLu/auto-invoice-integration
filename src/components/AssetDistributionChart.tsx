import { useMemo } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useInvoiceStore } from '@/store';
import { PieChart } from 'lucide-react';
import { ChartSkeleton } from './LoadingStates';

ChartJS.register(ArcElement, Tooltip, Legend);

const TYPE_LABELS: Record<string, string> = {
  cash: '現金',
  bank: '銀行',
  stock: '股票',
  crypto: '加密貨幣',
  real_estate: '不動產',
  other: '其他',
};

export default function AssetDistributionChart({
  className,
}: {
  className?: string;
}) {
  const { assets, isLoading } = useInvoiceStore();

  const distribution = useMemo(() => {
    const map = new Map<string, number>();
    assets.forEach(a => {
      const key = a.type || 'other';
      const current = map.get(key) || 0;
      map.set(key, current + (a.value || 0));
    });

    const entries = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);

    return {
      labels: entries.map(([type]) => TYPE_LABELS[type] || type),
      datasets: [
        {
          data: entries.map(([, amount]) => amount),
          backgroundColor: entries.map(
            (_, i) => `hsl(${(i * 60) % 360} 70% 50%)`
          ),
          borderWidth: 1,
        },
      ],
      rawData: entries.map(([type, amount]) => ({ type, amount })),
    };
  }, [assets]);

  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
      },
      tooltip: {
        callbacks: {
          label: context => {
            const idx = context.dataIndex;
            const value = distribution.datasets?.[0].data?.[idx] as
              | number
              | undefined;
            if (value !== undefined) {
              return `${new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0 }).format(value)}`;
            }
            return '';
          },
        },
      },
    },
  };

  if (isLoading) {
    return <ChartSkeleton className={className} />;
  }

  if (!assets.length) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" /> 資產分布
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            上傳資產或新增資產後顯示圖表
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChart className="h-5 w-5" /> 資產分布
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <Doughnut data={distribution} options={options} />
        </div>
      </CardContent>
    </Card>
  );
}
