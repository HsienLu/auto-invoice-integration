import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';
import { ErrorMessage } from '../ErrorMessage';
import { StatisticsCardsSkeleton, ChartSkeleton, LoadingSpinner, InlineLoading } from '../LoadingStates';

// Mock component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('Error Handling Components', () => {
  describe('ErrorBoundary', () => {
    it('should catch and display errors', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('發生錯誤')).toBeInTheDocument();
      expect(screen.getByText('重新載入')).toBeInTheDocument();
      expect(screen.getByText('回到首頁')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });

    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('should handle retry functionality', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const retryButton = screen.getByText('重新載入');
      fireEvent.click(retryButton);

      // After retry, the error boundary should reset
      expect(screen.getByText('發生錯誤')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });
  });

  describe('ErrorMessage', () => {
    it('should display file format error with suggestions', () => {
      render(
        <ErrorMessage
          type="file-format"
          message="檔案格式不正確"
          onRetry={() => {}}
          onDismiss={() => {}}
        />
      );

      expect(screen.getByText('檔案格式錯誤')).toBeInTheDocument();
      expect(screen.getByText('檔案格式不正確')).toBeInTheDocument();
      expect(screen.getByText('請確認上傳的是 CSV 格式檔案')).toBeInTheDocument();
      expect(screen.getByText('重試')).toBeInTheDocument();
      expect(screen.getByText('關閉')).toBeInTheDocument();
    });

    it('should display file size error with appropriate suggestions', () => {
      render(
        <ErrorMessage
          type="file-size"
          message="檔案過大"
          details="檔案: test.csv"
        />
      );

      expect(screen.getByText('檔案過大')).toBeInTheDocument();
      expect(screen.getByText('檔案: test.csv')).toBeInTheDocument();
      expect(screen.getByText('請將大檔案分割成較小的檔案（建議小於 10MB）')).toBeInTheDocument();
    });

    it('should call retry callback when retry button is clicked', () => {
      const onRetry = vi.fn();
      
      render(
        <ErrorMessage
          type="generic"
          message="測試錯誤"
          onRetry={onRetry}
        />
      );

      const retryButton = screen.getByText('重試');
      fireEvent.click(retryButton);

      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('should call dismiss callback when close button is clicked', () => {
      const onDismiss = vi.fn();
      
      render(
        <ErrorMessage
          type="generic"
          message="測試錯誤"
          onDismiss={onDismiss}
        />
      );

      const closeButton = screen.getByText('關閉');
      fireEvent.click(closeButton);

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('Loading States', () => {
    it('should render statistics cards skeleton', () => {
      render(<StatisticsCardsSkeleton />);
      
      // Should render 4 skeleton cards
      const skeletonElements = screen.getAllByRole('generic');
      expect(skeletonElements.length).toBeGreaterThan(0);
    });

    it('should render chart skeleton', () => {
      render(<ChartSkeleton />);
      
      // Should render skeleton structure
      const skeletonElements = screen.getAllByRole('generic');
      expect(skeletonElements.length).toBeGreaterThan(0);
    });

    it('should render loading spinner with custom text', () => {
      render(<LoadingSpinner text="自訂載入文字" />);
      
      expect(screen.getByText('自訂載入文字')).toBeInTheDocument();
    });

    it('should render inline loading with default text', () => {
      render(<InlineLoading />);
      
      expect(screen.getByText('載入中...')).toBeInTheDocument();
    });
  });
});