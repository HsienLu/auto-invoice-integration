import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import PersonalAssets from '../PersonalAssets';
import { useInvoiceStore } from '@/store';

describe('PersonalAssets page', () => {
  beforeEach(() => {
    // Reset store before each test
    useInvoiceStore.setState({ assets: [] });
  });

  it('renders header and allows adding an asset', () => {
    render(<PersonalAssets />);

    expect(screen.getByText('個人資產')).toBeInTheDocument();

    const addButton = screen.getByText('新增資產');
    expect(addButton).toBeInTheDocument();
    fireEvent.click(addButton);

    // Fill form
    const nameInput = screen.getByLabelText('名稱');
    const valueInput = screen.getByLabelText('價值');
    fireEvent.change(nameInput, { target: { value: 'Test Asset' } });
    fireEvent.change(valueInput, { target: { value: '1234' } });

    const createButtons = screen.getAllByText('新增資產');
    // The last button should be the dialog confirmation button
    const createButton = createButtons[createButtons.length - 1];
    fireEvent.click(createButton);

    // The new asset should appear in the table
    const row = screen.getByText('Test Asset').closest('tr');
    expect(row).toBeTruthy();
    expect(within(row as HTMLElement).getByText('1,234')).toBeInTheDocument();
  });

  it('allows editing an existing asset', () => {
    // Insert an initial asset
    useInvoiceStore.setState({
      assets: [
        {
          id: 'asset-1',
          name: 'Example',
          type: 'cash',
          value: 1000,
          currency: 'TWD',
        },
      ],
    });

    render(<PersonalAssets />);

    // Find row and edit button
    const row = screen.getByText('Example').closest('tr');
    expect(row).toBeTruthy();
    const editButton = within(row as HTMLElement).getByText('編輯');
    fireEvent.click(editButton);

    // Change value
    const valueInput = screen.getByLabelText('價值') as HTMLInputElement;
    fireEvent.change(valueInput, { target: { value: '2000' } });

    const saveButton = screen.getByText('儲存變更');
    fireEvent.click(saveButton);

    // Expect updated value to render
    const updatedRow = screen.getByText('Example').closest('tr');
    expect(updatedRow).toBeTruthy();
    expect(
      within(updatedRow as HTMLElement).getByText('2,000')
    ).toBeInTheDocument();
  });
});
