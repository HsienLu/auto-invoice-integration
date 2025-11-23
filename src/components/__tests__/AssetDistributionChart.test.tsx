import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import AssetDistributionChart from '../AssetDistributionChart';
import { useInvoiceStore } from '@/store';

describe('AssetDistributionChart', () => {
  beforeEach(() => {
    useInvoiceStore.setState({ assets: [] });
  });

  it('renders placeholder when no assets', () => {
    render(<AssetDistributionChart />);
    expect(
      screen.getByText(/上傳資產或新增資產後顯示圖表/)
    ).toBeInTheDocument();
  });

  it('renders chart when assets exist', () => {
    useInvoiceStore.setState({
      assets: [
        {
          id: 'a1',
          name: 'Wallet',
          type: 'cash',
          value: 1000,
          currency: 'TWD',
        },
        { id: 'a2', name: 'Bank', type: 'bank', value: 5000, currency: 'TWD' },
      ],
    });
    const { container } = render(<AssetDistributionChart />);
    // Chart.js renders a canvas element inside the component
    expect(container.querySelector('canvas')).toBeTruthy();
  });
});
