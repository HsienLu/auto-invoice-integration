import { useState, useMemo } from 'react';
import { Invoice, Statistics } from '@/types';
import { 
  exportStatisticsToPDF,
  validatePDFExportOptions,
  estimatePDFGenerationTime,
  captureChartElements,
  PDFExportOptions 
} from '@/lib/pdfExportService';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  AlertCircle, 
  CheckCircle2,
  Loader2,
  Download 
} from 'lucide-react';

interface PDFExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statistics: Statistics;
  invoices: Invoice[];
  title?: string;
  chartSelectors?: string[];
}

export function PDFExportDialog({ 
  open, 
  onOpenChange, 
  statistics,
  invoices,
  title = '匯出統計報告 PDF',
  chartSelectors = []
}: PDFExportDialogProps) {
  const [reportTitle, setReportTitle] = useState('發票統計報告');
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeDetailedData, setIncludeDetailedData] = useState(false);
  const [customFilename, setCustomFilename] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const availableCharts = useMemo(() => {
    return chartSelectors.filter(selector => {
      const element = document.querySelector(selector);
      return element !== null;
    });
  }, [chartSelectors]);

  const timeEstimate = useMemo(() => {
    return estimatePDFGenerationTime(
      invoices.length,
      includeCharts ? availableCharts.length : 0,
      includeDetailedData
    );
  }, [invoices.length, includeCharts, availableCharts.length, includeDetailedData]);

  const validation = useMemo(() => {
    return validatePDFExportOptions({
      title: reportTitle,
      includeCharts,
      includeDetailedData,
      filename: customFilename
    });
  }, [reportTitle, includeCharts, includeDetailedData, customFilename]);

  const handleExport = async () => {
    if (!validation.isValid) {
      setExportResult({
        success: false,
        message: validation.errors.join(', ')
      });
      return;
    }

    setIsExporting(true);
    setExportResult(null);

    // Create progress tracker
    const { createExportProgress, completeExport, failExport } = await import('@/lib/exportProgressService');
    const progressId = createExportProgress('pdf', '準備生成 PDF 報告...');

    try {
      // Capture chart elements if needed
      let chartElements: HTMLElement[] = [];
      if (includeCharts && availableCharts.length > 0) {
        chartElements = captureChartElements(availableCharts);
      }

      const options: PDFExportOptions = {
        title: reportTitle.trim(),
        includeCharts,
        includeDetailedData,
        filename: customFilename.trim() || undefined,
        chartElements
      };

      const result = await exportStatisticsToPDF(statistics, invoices, options, progressId);
      
      if (result.success) {
        completeExport(progressId, `成功生成 ${result.filename}`);
        setExportResult({
          success: true,
          message: `成功生成統計報告 ${result.filename}`
        });
        
        // Auto close dialog after successful export
        setTimeout(() => {
          onOpenChange(false);
          setExportResult(null);
        }, 2000);
      } else {
        failExport(progressId, result.error || '生成PDF失敗');
        setExportResult({
          success: false,
          message: result.error || '生成PDF失敗'
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '生成PDF時發生錯誤';
      failExport(progressId, errorMessage);
      setExportResult({
        success: false,
        message: errorMessage
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export Summary */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">報告摘要</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>發票數量: {invoices.length} 筆</p>
              <p>統計期間: {statistics.dateRange.start.toLocaleDateString('zh-TW')} - {statistics.dateRange.end.toLocaleDateString('zh-TW')}</p>
              <p>可用圖表: {availableCharts.length} 個</p>
              <p>預估生成時間: {timeEstimate.estimatedSeconds} 秒</p>
              {timeEstimate.warning && (
                <p className="text-amber-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {timeEstimate.warning}
                </p>
              )}
            </div>
          </div>

          {/* Report Configuration */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="reportTitle" className="text-base font-medium">
                報告標題
              </Label>
              <Input
                id="reportTitle"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                placeholder="發票統計報告"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="filename" className="text-base font-medium">
                自訂檔案名稱 (選填)
              </Label>
              <Input
                id="filename"
                value={customFilename}
                onChange={(e) => setCustomFilename(e.target.value)}
                placeholder="留空使用預設檔名"
                className="mt-1"
              />
            </div>
          </div>

          {/* Export Options */}
          <div className="space-y-4">
            <Label className="text-base font-medium">匯出選項</Label>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeCharts"
                  checked={includeCharts}
                  onCheckedChange={(checked) => setIncludeCharts(checked as boolean)}
                  disabled={availableCharts.length === 0}
                />
                <Label htmlFor="includeCharts" className="text-sm">
                  包含圖表 ({availableCharts.length} 個可用)
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeDetailedData"
                  checked={includeDetailedData}
                  onCheckedChange={(checked) => setIncludeDetailedData(checked as boolean)}
                />
                <Label htmlFor="includeDetailedData" className="text-sm">
                  包含詳細資料表格 (最多50筆)
                </Label>
              </div>
            </div>

            {availableCharts.length === 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  目前頁面沒有可擷取的圖表。請確保圖表已正確載入。
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Validation Errors */}
          {!validation.isValid && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {validation.errors.join(', ')}
              </AlertDescription>
            </Alert>
          )}

          {/* Export Result */}
          {exportResult && (
            <Alert variant={exportResult.success ? "default" : "destructive"}>
              {exportResult.success ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                {exportResult.message}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            取消
          </Button>
          <Button
            type="button"
            onClick={handleExport}
            disabled={!validation.isValid || isExporting || invoices.length === 0}
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                生成 PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}