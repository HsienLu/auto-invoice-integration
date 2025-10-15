import { useState, useMemo } from 'react';
import { Invoice } from '@/types';
import { 
  DEFAULT_EXPORT_FIELDS, 
  getFieldCategories,
  validateExportOptions,
  estimateExportSize,
  exportInvoicesToCSV,
  ExportOptions 
} from '@/lib/exportService';
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
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Download, 
  FileText, 
  AlertCircle, 
  CheckCircle2,
  Loader2 
} from 'lucide-react';

interface CSVExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoices: Invoice[];
  title?: string;
}

export function CSVExportDialog({ 
  open, 
  onOpenChange, 
  invoices, 
  title = '匯出 CSV 檔案' 
}: CSVExportDialogProps) {
  const [selectedFields, setSelectedFields] = useState<string[]>(DEFAULT_EXPORT_FIELDS);
  const [includeItems, setIncludeItems] = useState(false);
  const [customFilename, setCustomFilename] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const fieldCategories = useMemo(() => getFieldCategories(), []);
  
  const totalItemCount = useMemo(() => {
    return invoices.reduce((sum, invoice) => sum + invoice.items.length, 0);
  }, [invoices]);

  const exportEstimate = useMemo(() => {
    return estimateExportSize(invoices.length, totalItemCount, {
      selectedFields,
      includeItems,
      filename: customFilename
    });
  }, [invoices.length, totalItemCount, selectedFields, includeItems, customFilename]);

  const validation = useMemo(() => {
    return validateExportOptions({
      selectedFields,
      includeItems,
      filename: customFilename
    });
  }, [selectedFields, includeItems, customFilename]);

  const handleFieldToggle = (fieldKey: string, checked: boolean) => {
    if (checked) {
      setSelectedFields(prev => [...prev, fieldKey]);
    } else {
      setSelectedFields(prev => prev.filter(key => key !== fieldKey));
    }
  };

  const handleSelectAllInCategory = (category: string, select: boolean) => {
    const categoryFields = fieldCategories[category].map(f => f.key);
    
    if (select) {
      setSelectedFields(prev => [
        ...prev,
        ...categoryFields.filter(key => !prev.includes(key))
      ]);
    } else {
      setSelectedFields(prev => 
        prev.filter(key => !categoryFields.includes(key))
      );
    }
  };

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
    const progressId = createExportProgress('csv', '準備匯出 CSV 檔案...');

    try {
      const options: ExportOptions = {
        selectedFields,
        includeItems,
        filename: customFilename.trim() || undefined
      };

      const result = await exportInvoicesToCSV(invoices, options, progressId);
      
      if (result.success) {
        completeExport(progressId, `成功匯出 ${result.filename}`);
        setExportResult({
          success: true,
          message: `成功匯出 ${invoices.length} 筆發票資料到 ${result.filename}`
        });
        
        // Auto close dialog after successful export
        setTimeout(() => {
          onOpenChange(false);
          setExportResult(null);
        }, 2000);
      } else {
        failExport(progressId, result.error || '匯出失敗');
        setExportResult({
          success: false,
          message: result.error || '匯出失敗'
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '匯出過程中發生錯誤';
      failExport(progressId, errorMessage);
      setExportResult({
        success: false,
        message: errorMessage
      });
    } finally {
      setIsExporting(false);
    }
  };

  const categoryLabels: Record<string, string> = {
    invoice: '發票資訊',
    merchant: '商店資訊',
    amount: '金額資訊',
    date: '日期資訊'
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export Summary */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">匯出摘要</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>發票數量: {invoices.length} 筆</p>
              <p>品項數量: {totalItemCount} 項</p>
              <p>預估檔案大小: {exportEstimate.sizeKB} KB</p>
              {exportEstimate.warning && (
                <p className="text-amber-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {exportEstimate.warning}
                </p>
              )}
            </div>
          </div>

          {/* Export Options */}
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">匯出選項</Label>
              <div className="mt-2 space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeItems"
                    checked={includeItems}
                    onCheckedChange={(checked) => setIncludeItems(checked as boolean)}
                  />
                  <Label htmlFor="includeItems" className="text-sm">
                    包含品項明細 (每個品項一行)
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground ml-6">
                  勾選此選項將為每個品項建立一行，否則每張發票一行
                </p>
              </div>
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

          {/* Field Selection */}
          <div>
            <Label className="text-base font-medium">選擇匯出欄位</Label>
            <div className="mt-3 space-y-4">
              {Object.entries(fieldCategories).map(([category, fields]) => (
                <div key={category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">{categoryLabels[category]}</h4>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSelectAllInCategory(category, true)}
                        className="h-6 px-2 text-xs"
                      >
                        全選
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSelectAllInCategory(category, false)}
                        className="h-6 px-2 text-xs"
                      >
                        清除
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 pl-4">
                    {fields.map((field) => (
                      <div key={field.key} className="flex items-center space-x-2">
                        <Checkbox
                          id={field.key}
                          checked={selectedFields.includes(field.key)}
                          onCheckedChange={(checked) => 
                            handleFieldToggle(field.key, checked as boolean)
                          }
                        />
                        <Label 
                          htmlFor={field.key} 
                          className="text-sm cursor-pointer"
                        >
                          {field.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                  
                  {category !== 'date' && <Separator />}
                </div>
              ))}
            </div>
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
                匯出中...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                匯出 CSV
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}