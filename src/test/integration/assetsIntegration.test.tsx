import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import App from '../../../src/App';
import { useInvoiceStore } from '@/store';
import { assetService } from '@/lib/assetService';

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
);

describe('Assets Integration', () => {
  beforeEach(() => {
    useInvoiceStore.getState().clearAllData?.();
    // ensure no network calls by default; spy on assetService
    vi.spyOn(assetService, 'create').mockImplementation(async a => a as any);
    vi.spyOn(assetService, 'update').mockImplementation(
      async (id, updates) => ({ id, ...(updates as any) }) as any
    );
    vi.spyOn(assetService, 'remove').mockImplementation(async id => {});
  });

  it('can add asset and it appears in the asset list', async () => {
    render(<App />);

    // Navigate to assets (handle multiple instances of the text in DOM)
    const assetNavMatches = screen.getAllByText('資產管理');
    const assetLink = assetNavMatches.find(
      node => node.closest('a')?.getAttribute('href') === '/assets'
    );
    if (assetLink) fireEvent.click(assetLink.closest('a') as HTMLElement);

    // Open add dialog
    const addButton = screen.getByText('新增資產');
    fireEvent.click(addButton);

    fireEvent.change(screen.getByLabelText('名稱'), {
      target: { value: 'Integration Asset' },
    });
    fireEvent.change(screen.getByLabelText('價值'), {
      target: { value: '1500' },
    });

    // Click confirmation button (the dialog confirm is the last one)
    const createButtons = screen.getAllByText('新增資產');
    fireEvent.click(createButtons[createButtons.length - 1]);

    await waitFor(() =>
      expect(screen.getByText('Integration Asset')).toBeInTheDocument()
    );
    const row = screen.getByText('Integration Asset').closest('tr');
    expect(within(row as HTMLElement).getByText('1,500')).toBeInTheDocument();
  });

  it('can edit an asset', async () => {
    // create an initial asset
    useInvoiceStore.getState().setAssets([
      {
        id: 'asset-int',
        name: 'EditMe',
        type: 'cash',
        value: 500,
        currency: 'TWD',
      },
    ]);

    render(<App />);

    const assetNavMatches2 = screen.getAllByText('資產管理');
    const assetLink2 = assetNavMatches2.find(
      node => node.closest('a')?.getAttribute('href') === '/assets'
    );
    if (assetLink2) fireEvent.click(assetLink2.closest('a') as HTMLElement);

    // Click edit
    const row = screen.getByText('EditMe').closest('tr') as HTMLElement;
    const editBtn = within(row).getByText('編輯');
    fireEvent.click(editBtn);

    // Update value
    const valueInput = screen.getByLabelText('價值') as HTMLInputElement;
    fireEvent.change(valueInput, { target: { value: '2500' } });
    fireEvent.click(screen.getByText('儲存變更'));

    await waitFor(() =>
      expect(within(row).getByText('2,500')).toBeInTheDocument()
    );
  });
});
