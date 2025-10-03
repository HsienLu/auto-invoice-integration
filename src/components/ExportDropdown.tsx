import { useState } from 'react';
import { Invoice, Statistics } from '@/types';
import { Button } from '@/components/ui/button';
import { CSVExportDialog } from '@/components/CSVExportDialog';
import { PDFExportDialog } from '@/components/PDFExportDialog';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileText, Table, ChevronDown } from 'lucide-react';

interface ExportDropdownProps {
  invoices: Invoice[];
  statistics?: Statistics;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  disabled?: boolean;
  chartSelectors?: string[];
}

export function ExportDropdown({ 
  invoices, 
  statistics,
  variant = 'outline',
  size = 'default',
  className,
  disabled = false,
  chartSelectors = []
}: ExportDropdownProps) {
  const [showCSVDialog, setShowCSVDialog] = useState(false);
  const [showPDFDialog, setShowPDFDialog] = useState(false);

  const hasData = invoices.length > 0;
  const hasStatistics = statistics !== undefined;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant}
            size={size}
            disabled={disabled || !hasData}
            className={className}
          >
            <Download className="mr-2 h-4 w-4" />
            匯出資料
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem 
            onClick={() => setShowCSVDialog(true)}
            disabled={!hasData}
          >
            <Table className="mr-2 h-4 w-4" />
            匯出 CSV 檔案
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={() => setShowPDFDialog(true)}
            disabled={!hasData || !hasStatistics}
          >
            <FileText className="mr-2 h-4 w-4" />
            匯出統計報告 PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* CSV Export Dialog */}
      <CSVExportDialog
        open={showCSVDialog}
        onOpenChange={setShowCSVDialog}
        invoices={invoices}
      />

      {/* PDF Export Dialog */}
      {hasStatistics && (
        <PDFExportDialog
          open={showPDFDialog}
          onOpenChange={setShowPDFDialog}
          statistics={statistics}
          invoices={invoices}
          chartSelectors={chartSelectors}
        />
      )}
    </>
  );
}