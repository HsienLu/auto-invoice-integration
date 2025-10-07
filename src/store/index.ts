import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Invoice, FileInfo, Statistics } from '@/types';
import { calculateBasicStatistics, getValidInvoices } from '@/lib/statisticsService';

const ensureDate = (value: Date | string | number): Date => {
  if (value instanceof Date) {
    return value;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }

  return parsed;
};

const ensureOptionalDate = (
  value: Date | string | number | null | undefined
): Date | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }

  return ensureDate(value);
};

const deserializeInvoice = (invoice: Invoice): Invoice => ({
  ...invoice,
  invoiceDate: ensureDate(invoice.invoiceDate),
  items: invoice.items.map(item => ({ ...item })),
});

const deserializeFile = (file: FileInfo): FileInfo => ({
  ...file,
  uploadDate: ensureDate(file.uploadDate),
  lastProcessedDate: ensureOptionalDate(file.lastProcessedDate ?? undefined),
});

const deserializeStatistics = (statistics: Statistics): Statistics => ({
  ...statistics,
  dateRange: {
    start: ensureDate(statistics.dateRange.start),
    end: ensureDate(statistics.dateRange.end),
  },
  timeSeriesData: statistics.timeSeriesData.map(point => ({
    ...point,
    date: ensureDate(point.date),
  })),
});

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
        const normalizedInvoices = invoices.map(deserializeInvoice);
        set({ invoices: normalizedInvoices });
        // Auto-refresh statistics when invoices change
        const validInvoices = getValidInvoices(normalizedInvoices);
        const newStatistics = calculateBasicStatistics(validInvoices);
        set({ statistics: newStatistics });
      },

      addInvoices: (newInvoices) => {
        set((state) => {
          const normalizedNewInvoices = newInvoices.map(deserializeInvoice);
          const updatedInvoices = [...state.invoices, ...normalizedNewInvoices];
          const validInvoices = getValidInvoices(updatedInvoices);
          const newStatistics = calculateBasicStatistics(validInvoices);
          return {
            invoices: updatedInvoices,
            statistics: newStatistics,
          };
        });
      },

      setFiles: (files) => set({ files: files.map(deserializeFile) }),

      addFile: (file) =>
        set((state) => ({
          files: [...state.files, deserializeFile(file)],
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
          files: state.files.map((file) => {
            if (file.id !== fileId) {
              return file;
            }

            const nextFile = {
              ...file,
              ...updates,
            } as FileInfo;

            if (updates.uploadDate) {
              nextFile.uploadDate = ensureDate(updates.uploadDate);
            }

            if (updates.lastProcessedDate) {
              nextFile.lastProcessedDate = ensureOptionalDate(
                updates.lastProcessedDate
              );
            }

            return nextFile;
          }),
        })),

      setStatistics: (statistics) => set({ statistics: deserializeStatistics(statistics) }),
      
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
      merge: (persistedState, currentState) => {
        if (!persistedState) {
          return currentState;
        }

        const typedState = persistedState as InvoiceStore;

        return {
          ...currentState,
          ...typedState,
          invoices: (typedState.invoices || currentState.invoices).map(
            deserializeInvoice
          ),
          files: (typedState.files || currentState.files).map(deserializeFile),
          statistics: typedState.statistics
            ? deserializeStatistics(typedState.statistics)
            : null,
        };
      },
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