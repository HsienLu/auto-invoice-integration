import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Invoice, FileInfo, Statistics, Asset } from '@/types';
import { assetService } from '@/lib/assetService';
import {
  calculateBasicStatistics,
  getValidInvoices,
} from '@/lib/statisticsService';

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

const deserializeAsset = (asset: Asset): Asset => ({
  ...asset,
  acquiredDate: asset.acquiredDate ? ensureDate(asset.acquiredDate) : undefined,
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
  assets: Asset[];
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
  // Legacy alias used by tests
  clearAllData?: () => void;
  // Assets actions
  setAssets: (assets: Asset[]) => void;
  addAsset: (asset: Asset) => void;
  // Remote (async) asset operations related to the backend
  createAssetRemote: (asset: Asset) => Promise<boolean>;
  updateAssetRemote: (
    assetId: string,
    updates: Partial<Asset>
  ) => Promise<boolean>;
  removeAssetRemote: (assetId: string) => Promise<boolean>;
  updateAsset: (assetId: string, updates: Partial<Asset>) => void;
  removeAsset: (assetId: string) => void;
  refreshStatistics: () => void;
}

export const useInvoiceStore = create<InvoiceStore>()(
  persist(
    set => ({
      // Initial state
      invoices: [],
      files: [],
      assets: [],
      statistics: null,
      isLoading: false,
      error: null,

      // Actions
      setInvoices: invoices => {
        const normalizedInvoices = invoices.map(deserializeInvoice);
        set({ invoices: normalizedInvoices });
        // Auto-refresh statistics when invoices change
        const validInvoices = getValidInvoices(normalizedInvoices);
        const newStatistics = calculateBasicStatistics(validInvoices);
        set({ statistics: newStatistics });
      },

      addInvoices: newInvoices => {
        set(state => {
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

      setFiles: files => set({ files: files.map(deserializeFile) }),

      setAssets: assets => set({ assets: assets.map(deserializeAsset) }),

      // Local synchronous add (keeps backward compat)
      addAsset: asset =>
        set(state => ({ assets: [...state.assets, deserializeAsset(asset)] })),

      // Remote create: perform optimistic update then call API
      createAssetRemote: async (asset: Asset) => {
        const normalized = deserializeAsset(asset);
        set(state => ({ assets: [...state.assets, normalized] }));
        try {
          const created = await assetService.create(normalized);
          set(state => ({
            assets: state.assets.map(a =>
              a.id === normalized.id ? deserializeAsset(created) : a
            ),
          }));
          return true;
        } catch (err) {
          // rollback
          set(state => ({
            assets: state.assets.filter(a => a.id !== normalized.id),
          }));
          set({ error: String(err) });
          return false;
        }
      },

      updateAsset: (assetId, updates) =>
        set(state => ({
          assets: state.assets.map(a => {
            if (a.id !== assetId) return a;
            const next = { ...a, ...updates } as Asset;
            if (updates.acquiredDate)
              next.acquiredDate = ensureDate(updates.acquiredDate as Date);
            return next;
          }),
        })),

      removeAsset: assetId =>
        set(state => ({
          assets: state.assets.filter(a => a.id !== assetId),
        })),

      // Remote update: optimistic update and call API
      updateAssetRemote: async (assetId: string, updates: Partial<Asset>) => {
        const prev = useInvoiceStore
          .getState()
          .assets.find(a => a.id === assetId);
        set(state => ({
          assets: state.assets.map(a =>
            a.id === assetId ? { ...a, ...(updates as any) } : a
          ),
        }));
        try {
          const updated = await assetService.update(assetId, updates);
          set(state => ({
            assets: state.assets.map(a =>
              a.id === assetId ? deserializeAsset(updated) : a
            ),
          }));
          return true;
        } catch (err) {
          // rollback
          if (prev) {
            set(state => ({
              assets: state.assets.map(a => (a.id === assetId ? prev : a)),
            }));
          }
          set({ error: String(err) });
          return false;
        }
      },

      addFile: file =>
        set(state => ({
          files: [...state.files, deserializeFile(file)],
        })),

      removeFile: fileId =>
        set(state => {
          const updatedFiles = state.files.filter(file => file.id !== fileId);
          const updatedInvoices = state.invoices.filter(
            _invoice => !state.files.find(file => file.id === fileId)
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
        set(state => ({
          files: state.files.map(file => {
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

      setStatistics: statistics =>
        set({ statistics: deserializeStatistics(statistics) }),

      setLoading: isLoading => set({ isLoading }),

      setError: error => set({ error }),

      clearData: () =>
        set({
          invoices: [],
          files: [],
          assets: [],
          statistics: null,
          error: null,
        }),
      // Keep backwards-compat alias for tests
      clearAllData: () =>
        set({
          invoices: [],
          files: [],
          assets: [],
          statistics: null,
          error: null,
        }),

      removeAssetRemote: async (assetId: string) => {
        const prev = useInvoiceStore.getState().assets;
        set(state => ({ assets: state.assets.filter(a => a.id !== assetId) }));
        try {
          await assetService.remove(assetId);
          return true;
        } catch (err) {
          set({ assets: prev });
          set({ error: String(err) });
          return false;
        }
      },

      refreshStatistics: () => {
        set(state => {
          const validInvoices = getValidInvoices(state.invoices);
          const newStatistics = calculateBasicStatistics(validInvoices);
          return { statistics: newStatistics };
        });
      },
    }),
    {
      name: 'invoice-store',
      partialize: state => ({
        invoices: state.invoices,
        files: state.files,
        assets: state.assets,
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
          assets: (typedState.assets || currentState.assets).map(
            deserializeAsset
          ),
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
    return (
      invoiceDate >= start && invoiceDate <= end && invoice.status === 'issued'
    );
  });
};

export const getInvoicesByMerchant = (merchantName: string): Invoice[] => {
  const state = useInvoiceStore.getState();
  return state.invoices.filter(
    invoice =>
      invoice.merchantName.toLowerCase().includes(merchantName.toLowerCase()) &&
      invoice.status === 'issued'
  );
};

// Asset helpers
export const getTotalAssetValue = (currencyFilter?: string): number => {
  const state = useInvoiceStore.getState();
  return state.assets
    .filter(a => (currencyFilter ? a.currency === currencyFilter : true))
    .reduce((sum, a) => sum + (a.value || 0), 0);
};

export const getAssetsByType = (type: string): Asset[] => {
  const state = useInvoiceStore.getState();
  return state.assets.filter(a => a.type === type);
};
