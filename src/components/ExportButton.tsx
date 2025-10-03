import React, { useState } from 'react';
import { Invoice } from '@/types';
import { Button } from '@/components/ui/button';
import { CSVExportDialog } from '@/components/CSVExportDialog';
import { Download } from 'lucide-react';

interface ExportButtonProps {
  invoices: Invoice[];
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  children?: React.ReactNode;
  disabled?: boolean;
}

export function ExportButton({ 
  invoices, 
  variant = 'outline',
  size = 'default',
  className,
  children,
  disabled = false
}: ExportButtonProps) {
  const [showExportDialog, setShowExportDialog] = useState(false);

  const handleExportClick = () => {
    if (invoices.length === 0) {
      return;
    }
    setShowExportDialog(true);
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleExportClick}
        disabled={disabled || invoices.length === 0}
        className={className}
      >
        <Download className="mr-2 h-4 w-4" />
        {children || '匯出 CSV'}
      </Button>

      <CSVExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        invoices={invoices}
      />
    </>
  );
}