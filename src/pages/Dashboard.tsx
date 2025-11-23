import { Link } from 'react-router-dom';
import { Upload } from 'lucide-react';
import { StatisticsCards } from '@/components/StatisticsCards';
import { TimeSeriesChart } from '@/components/TimeSeriesChart';
import { CategoryChart } from '@/components/CategoryChart';
import AssetDistributionChart from '@/components/AssetDistributionChart';
import { useInvoiceStore } from '@/store';
import { memo } from 'react';

const Dashboard = memo(function Dashboard() {
  const { statistics } = useInvoiceStore();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold">儀表板</h1>
        <p className="text-muted-foreground mt-2">
          歡迎使用發票整理儀表板。查看您的消費統計和分析結果。
        </p>
      </div>

      {/* Statistics Cards */}
      <StatisticsCards />

      {/* Getting Started - Show only when no data */}
      {!statistics && (
        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">開始使用</h2>
          <p className="text-muted-foreground mb-4">
            請先上傳您的發票CSV檔案來開始分析您的消費數據。
          </p>
          <Link
            to="/files"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
          >
            <Upload className="h-4 w-4" />
            上傳發票檔案
          </Link>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TimeSeriesChart />
        <CategoryChart />
        <AssetDistributionChart />
      </div>
    </div>
  );
});

export default Dashboard;
