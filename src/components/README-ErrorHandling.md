# 錯誤處理和使用者體驗優化

本文件說明已實作的錯誤處理和使用者體驗優化功能。

## 已實作的組件

### 1. 全域錯誤邊界 (ErrorBoundary)

**檔案位置：** `src/components/ErrorBoundary.tsx`

**功能：**
- 捕獲 React 組件樹中的 JavaScript 錯誤
- 顯示友善的錯誤訊息介面
- 提供重新載入和回到首頁的選項
- 在開發環境中顯示詳細錯誤資訊

**使用方式：**
```tsx
<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

### 2. 載入狀態組件 (LoadingStates)

**檔案位置：** `src/components/LoadingStates.tsx`

**包含的組件：**
- `StatisticsCardsSkeleton` - 統計卡片載入骨架
- `ChartSkeleton` - 圖表載入骨架
- `DataTableSkeleton` - 資料表格載入骨架
- `FileListSkeleton` - 檔案清單載入骨架
- `LoadingSpinner` - 通用載入旋轉器
- `PageLoadingOverlay` - 頁面載入覆蓋層
- `InlineLoading` - 內聯載入狀態

**使用方式：**
```tsx
// 在組件中使用
if (isLoading) {
  return <StatisticsCardsSkeleton />;
}

// 自訂載入文字
<LoadingSpinner text="處理中..." />
```

### 3. 錯誤訊息組件 (ErrorMessage)

**檔案位置：** `src/components/ErrorMessage.tsx`

**支援的錯誤類型：**
- `file-format` - 檔案格式錯誤
- `file-size` - 檔案大小錯誤
- `file-encoding` - 檔案編碼錯誤
- `parse-error` - 資料解析錯誤
- `network-error` - 網路連線錯誤
- `storage-error` - 儲存空間錯誤
- `generic` - 一般錯誤

**功能：**
- 根據錯誤類型顯示相應的圖示和標題
- 提供具體的解決建議
- 支援重試和關閉操作
- 包含內聯和彈出式版本

**使用方式：**
```tsx
<ErrorMessage
  type="file-format"
  message="檔案格式不正確"
  details="檔案: example.csv"
  onRetry={() => handleRetry()}
  onDismiss={() => handleDismiss()}
/>
```

### 4. 離線狀態處理 (OfflineStatus)

**檔案位置：** `src/components/OfflineStatus.tsx`

**功能：**
- 監聽網路連線狀態
- 在離線時顯示警告訊息
- 在重新連線時顯示確認訊息
- 提供 `useOnlineStatus` Hook

**使用方式：**
```tsx
// 自動顯示離線狀態
<OfflineStatus />

// 在組件中檢查線上狀態
const isOnline = useOnlineStatus();
```

### 5. 錯誤服務 (ErrorService)

**檔案位置：** `src/lib/errorService.ts`

**功能：**
- 統一的錯誤處理和分類
- 錯誤事件訂閱機制
- 錯誤統計和記錄
- 提供多種錯誤處理方法

**使用方式：**
```tsx
import { useErrorService } from '@/lib/errorService';

const { handleFileError, handleNetworkError } = useErrorService();

try {
  // 一些操作
} catch (error) {
  const appError = handleFileError(error, fileName);
  // 錯誤會自動通知到全域錯誤通知系統
}
```

### 6. 錯誤通知提供者 (ErrorNotificationProvider)

**檔案位置：** `src/components/ErrorNotificationProvider.tsx`

**功能：**
- 全域錯誤通知管理
- 錯誤佇列處理
- 自動顯示和隱藏錯誤訊息
- 提供錯誤通知 Context

**使用方式：**
```tsx
// 在 App 根組件中包裝
<ErrorNotificationProvider>
  <YourApp />
</ErrorNotificationProvider>

// 在組件中使用
const { showError, hideError } = useErrorNotification();
```

## 整合到現有組件

### 已更新的組件

1. **App.tsx** - 添加了 ErrorBoundary 和 ErrorNotificationProvider
2. **StatisticsCards.tsx** - 使用 StatisticsCardsSkeleton
3. **TimeSeriesChart.tsx** - 使用 ChartSkeleton
4. **CategoryChart.tsx** - 使用 ChartSkeleton
5. **FileList.tsx** - 使用 FileListSkeleton
6. **FileUploader.tsx** - 使用 ErrorMessage 組件
7. **csvService.ts** - 整合 errorService 進行錯誤處理

### 使用模式

#### 載入狀態
```tsx
const { isLoading } = useInvoiceStore();

if (isLoading) {
  return <StatisticsCardsSkeleton />;
}
```

#### 錯誤處理
```tsx
try {
  await someAsyncOperation();
} catch (error) {
  const appError = errorService.handleFileError(error, fileName);
  setError(appError);
}
```

#### 條件式錯誤顯示
```tsx
{error && (
  <ErrorMessage
    type={error.type}
    message={error.message}
    onRetry={handleRetry}
    onDismiss={() => setError(null)}
  />
)}
```

## 測試

**測試檔案：** `src/components/__tests__/ErrorHandling.test.tsx`

**測試覆蓋：**
- ErrorBoundary 錯誤捕獲和重試功能
- ErrorMessage 不同錯誤類型的顯示
- LoadingStates 各種載入狀態組件
- 使用者互動（重試、關閉按鈕）

## 最佳實踐

### 1. 錯誤分類
- 根據錯誤類型使用適當的 ErrorType
- 提供具體的錯誤訊息和解決建議
- 包含相關的上下文資訊（如檔案名稱）

### 2. 載入狀態
- 在所有異步操作中顯示載入狀態
- 使用適當的骨架屏匹配實際內容結構
- 提供有意義的載入文字

### 3. 使用者體驗
- 提供明確的操作回饋
- 允許使用者重試失敗的操作
- 在適當的時候自動隱藏訊息

### 4. 錯誤恢復
- 實作適當的錯誤邊界
- 提供回到安全狀態的選項
- 保持應用程式的穩定性

## 未來擴展

1. **錯誤報告** - 整合錯誤報告服務
2. **效能監控** - 添加效能指標追蹤
3. **使用者回饋** - 收集使用者對錯誤處理的回饋
4. **國際化** - 支援多語言錯誤訊息
5. **進階重試邏輯** - 實作指數退避重試機制