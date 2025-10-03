import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Invoice, FileInfo, Statistics } from '@/types';
import { calculateBasicStatistics, getValidInvoices } from '@/lib/statisticsService';

interface InvoiceStore {
  // State
  invoices: Invoice[];
  files: FileInfo[];
  statistics: Statistics | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setInvoices: (invoices: Invoice[]) => void;
  addInvoices: (invoices: Invoice[]) => void;
  setFiles: (files: FileInfo[]) => void;
  addFile: (file: FileInfo) => void;
  removeFile: (fileId: string) => void;
  updateFile: (fileId: string, updates: Partial<FileInfo>) => void;
  setStatistics: (statistics: Statistics) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearData: () => void;
  refreshStatistics: () => void;
}

export const useInvoiceStore = create<InvoiceStore>()(
  persist(
    (set) => ({
      // Initial state
      invoices: [],
      files: [],
      statistics: null,
      isLoading: false,
      error: null,

      // Actions
      setInvoices: (invoices) => {
        set({ invoices });
        // Auto-refresh statistics when invoices change
        const validInvoices = getValidInvoices(invoices);
        const newStatistics = calculateBasicStatistics(validInvoices);
        set({ statistics: newStatistics });
      },
      
      addInvoices: (newInvoices) => {
        set((state) => {
          const updatedInvoices = [...state.invoices, ...newInvoices];
          const validInvoices = getValidInvoices(updatedInvoices);
          const newStatistics = calculateBasicStatistics(validInvoices);
          return {
            invoices: updatedInvoices,
            statistics: newStatistics,
          };
        });
      },

      setFiles: (files) => set({ files }),
      
      addFile: (file) =>
        set((state) => ({
          files: [...state.files, file],
        })),

      removeFile: (fileId) =>
        set((state) => {
          const updatedFiles = state.files.filter((file) => file.id !== fileId);
          const updatedInvoices = state.invoices.filter(
            (_invoice) => !state.files.find((file) => file.id === fileId)
          );
          const validInvoices = getValidInvoices(updatedInvoices);
          const newStatistics = calculateBasicStatistics(validInvoices);
          
          return {
            files: updatedFiles,
            invoices: updatedInvoices,
            statistics: newStatistics,
          };
        }),

      updateFile: (fileId, updates) =>
        set((state) => ({
          files: state.files.map((file) =>
            file.id === fileId ? { ...file, ...updates } : file
          ),
        })),

      setStatistics: (statistics) => set({ statistics }),
      
      setLoading: (isLoading) => set({ isLoading }),
      
      setError: (error) => set({ error }),
      
      clearData: () =>
        set({
          invoices: [],
          files: [],
          statistics: null,
          error: null,
        }),

      refreshStatistics: () => {
        set((state) => {
          const validInvoices = getValidInvoices(state.invoices);
          const newStatistics = calculateBasicStatistics(validInvoices);
          return { statistics: newStatistics };
        });
      },
    }),
    {
      name: 'invoice-store',
      partialize: (state) => ({
        invoices: state.invoices,
        files: state.files,
        statistics: state.statistics,
      }),
    }
  )
);

// Utility functions for computed values
export const getValidInvoicesFromStore = (): Invoice[] => {
  const state = useInvoiceStore.getState();
  return getValidInvoices(state.invoices);
};

export const getInvoicesByDateRange = (start: Date, end: Date): Invoice[] => {
  const state = useInvoiceStore.getState();
  return state.invoices.filter(invoice => {
    const invoiceDate = invoice.invoiceDate;
    return invoiceDate >= start && invoiceDate <= end && invoice.status === 'issued';
  });
};

export const getInvoicesByMerchant = (merchantName: string): Invoice[] => {
  const state = useInvoiceStore.getState();
  return state.invoices.filter(invoice => 
    invoice.merchantName.toLowerCase().includes(merchantName.toLowerCase()) &&
    invoice.status === 'issued'
  );
};