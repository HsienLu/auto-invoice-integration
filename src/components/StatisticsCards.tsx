import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useInvoiceStore } from '@/store';
import { StatisticsCardsSkeleton } from './LoadingStates';
import { BarChart3, FileText, TrendingUp, Calendar } from 'lucide-react';
import { useMemo, memo, useCallback } from 'react';

interface StatisticsCardsProps {
  className?: string;
}

export const StatisticsCards = memo(function StatisticsCards({ className }: StatisticsCardsProps) {
  const { statistics, isLoading, invoices } = useInvoiceStore();

  // Calculate additional metrics
  const additionalMetrics = useMemo(() => {
    if (!statistics || !invoices.length) {
      return {
        validInvoicesCount: 0,
        voidedInvoicesCount: 0,
        dateRangeText: '無資料',
      };
    }

    const validInvoices = invoices.filter(inv => inv.status === 'issued');
    const voidedInvoices = invoices.filter(inv => inv.status === 'voided');
    
    const startDate = statistics.dateRange.start;
    const endDate = statistics.dateRange.end;
    const dateRangeText = `${startDate.toLocaleDateString('zh-TW')} - ${endDate.toLocaleDateString('zh-TW')}`;

    return {
      validInvoicesCount: validInvoices.length,
      voidedInvoicesCount: voidedInvoices.length,
      dateRangeText,
    };
  }, [statistics, invoices]);

  // Format currency - memoized to avoid recreation on every render
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0,
    }).format(amount);
  }, []);

  // Loading skeleton
  if (isLoading) {
    return <StatisticsCardsSkeleton />;
  }

  // No data state
  if (!statistics) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              總消費金額
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0</div>
            <p className="text-xs text-muted-foreground">
              尚無資料
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              發票總數
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              尚無資料
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              平均消費
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0</div>
            <p className="text-xs text-muted-foreground">
              尚無資料
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              資料期間
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">
              尚無資料
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
      {/* Total Amount Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            總消費金額
          </CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(statistics.totalAmount)}
          </div>
          <p className="text-xs text-muted-foreground">
            {statistics.totalInvoices} 張發票
          </p>
        </CardContent>
      </Card>

      {/* Invoice Count Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            有效發票數
          </CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {additionalMetrics.validInvoicesCount}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {additionalMetrics.voidedInvoicesCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                作廢: {additionalMetrics.voidedInvoicesCount}
              </Badge>
            )}
            <span>總計: {statistics.totalInvoices}</span>
          </div>
        </CardContent>
      </Card>

      {/* Average Amount Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            平均消費
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(statistics.averageAmount)}
          </div>
          <p className="text-xs text-muted-foreground">
            每張發票平均
          </p>
        </CardContent>
      </Card>

      {/* Date Range Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            資料期間
          </CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-sm font-bold leading-tight">
            {additionalMetrics.dateRangeText}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {Math.ceil((statistics.dateRange.end.getTime() - statistics.dateRange.start.getTime()) / (1000 * 60 * 60 * 24))} 天
          </p>
        </CardContent>
      </Card>
    </div>
  );
});

export default StatisticsCards;