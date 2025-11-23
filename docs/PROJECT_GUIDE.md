# 發票整理儀表板專案指南

> 本指南彙整系統架構、模組契約、資料流程、品質策略與操作守則，協助新成員、維運與產品利害關係人快速理解與拓展專案。

## 目錄

1. [文檔目的與範圍](#1-文檔目的與範圍)
2. [使用者旅程與版位](#2-使用者旅程與版位)
3. [系統架構快照](#3-系統架構快照)
4. [模組詳解](#4-模組詳解)
5. [資料生命週期](#5-資料生命週期)
6. [測試與品質策略](#6-測試與品質策略)
7. [開發流程與程式碼規範](#7-開發流程與程式碼規範)
8. [運維與自動化腳本](#8-運維與自動化腳本)
9. [疑難排解備忘](#9-疑難排解備忘)
10. [進階參考](#10-進階參考)

---

## 1. 文檔目的與範圍

- **對象**：前端工程師、QA、DevOps、產品/資料分析同仁。
- **範圍**：純前端（React + Vite）專案，涵蓋 CSV 解析、統計與匯出流程，以及相關自動化腳本。後端 / API 由電子發票載具平台提供，本系統僅處理前端 CSV。
- **交付成果**：描述模組責任、資料結構、測試策略與部署/運維配套，補足 README 的高階說明。

## 2. 使用者旅程與版位

| 旅程階段 | 主要頁面 / 功能 | 契約 | 成功標準 |
| --- | --- | --- | --- |
| 1️⃣ 登入 / 瞬時價值 | Dashboard (`src/pages/Dashboard.tsx`) | 立即顯示統計卡與空狀態提示 | 3 秒內呈現 KPI 或引導上傳 |
| 2️⃣ 上傳與資料信任 | File Manager (`src/pages/FileManager.tsx`) | `FileUploader`, `FileList`, `useFileReprocessing` | 檔案驗證明確，錯誤可重試 |
| 3️⃣ 深入分析 | Analytics (`src/pages/Analytics.tsx`) | `FilterPanel`, `AdvancedCharts`, `DataTable` | 篩選即時、匯出可控 |
| 4️⃣ 匯出 / 分享 | `CSVExportDialog`, `PDFExportDialog` | `exportService`, `exportProgressService` | 匯出進度透明、錯誤可重試 |

## 3. 系統架構快照

### 3.1 技術堆疊

- **View 層**：React 18 + React Router v6 + Tailwind + shadcn/ui。
- **狀態管理**：Zustand `useInvoiceStore` (含 `persist`)，搭配 `statisticsService` 產出衍生資料。
- **CSV 管線**：PapaParse chunk 解析、`csvService` 服務層、`memoryOptimizer` 控制記憶體。
- **資料視覺化**：Chart.js 4 + react-chartjs-2，含標準與進階圖表元件。
- **匯出**：`exportService` (CSV)、`pdfExportService` (PDF)、`exportProgressService` (進度/補償機制)。
- **韌性**：`ErrorBoundary`, `ErrorNotificationProvider`, `OfflineStatus`, `errorService`, `usePerformanceMonitor`。
- **開發/運維**：Vite、Vitest、Playwright、Docker、專屬腳本 (`scripts/*.js`)。

### 3.2 高階架構圖

```mermaid
graph TD
  subgraph 體驗層
    A[React Router 頁面]
    B[shadcn/ui 元件]
  end
  subgraph 狀態層
    C[Zustand Store]
    D[statisticsService]
  end
  subgraph 服務層
    E[csvService + PapaParse]
    F[exportService/pdfExportService]
    G[errorService]
  end
  subgraph 工具層
    H[memoryOptimizer]
    I[filterService]
    J[exportProgressService]
  end

  A --> C
  B --> A
  C --> D
  E --> C
  F --> C
  C --> F
  H --> E
  G --> {B, A}
  J --> F
  I --> A
```

## 4. 模組詳解

### 4.1 狀態與型別

- `src/store/index.ts`：唯一的 Zustand store，保存 `invoices`, `files`, `statistics`, `error` 與 Loading 狀態。
  - 重要方法：`setInvoices`, `addInvoices`, `updateFile`, `refreshStatistics`, `clearData`。
  - `persist` key：`invoice-store`，只儲存核心資料，避免巨大計算結果影響載入。
- `src/types/index.ts`：定義 `Invoice`, `InvoiceItem`, `Statistics`, `FileInfo`, `FilterCriteria`。任何 API / Hook 輸入輸出應引用此型別以維持一致。

### 4.2 CSV / 檔案管線

| 元件 | 位置 | 功能 |
| --- | --- | --- |
| `FileUploader` | `src/components/FileUploader.tsx` | 拖放、多檔、上傳狀態、錯誤提示、進度視窗 (`ParseProgressDialog`) |
| `csvService` | `src/lib/csvService.ts` | 驗證、解析、更新 store、儲存原檔、重新處理 (`reprocessFile`) |
| `csvParser` | `src/lib/csvParser.ts` | 實際解析 M/D 行、欄位順序檢測、記憶體優化 |
| `memoryOptimizer` | `src/lib/memoryOptimizer.ts` | chunk 處理、記憶體監控、資料去重、GC 提示 |
| `useFileReprocessing` | `src/hooks/useFileReprocessing.ts` | 重新處理 UI 行為與建議訊息 |

### 4.3 分析與圖表

- `statisticsService`：提供基本與延伸統計（月報、商家、品項、作廢），並包含篩選輔助函式。
- `statisticsIntegration`：包裝 store 與 service，對外產生 `useExtendedStatistics()` 等 helper。
- `FilterPanel`, `AdvancedTimeSeriesChart`, `AdvancedCategoryChart`, `DataTable`：組合 `filterService` 的結果提供互動分析。

### 4.4 匯出 / 通知

- `exportService`：欄位配置 (`EXPORT_FIELDS`)、摘要 vs. 明細模式、大小估算 (`estimateExportSize`)、欄位驗證。
- `pdfExportService`：使用 `html2canvas` + `jsPDF` 擷取畫面。
- `exportProgressService`：Zustand store 追蹤匯出進度、狀態訊息、錯誤建議與 retry。
- `ExportButton`, `ExportDropdown`, `ExportProgressNotification`：封裝 UI 流程。

### 4.5 錯誤防護 / 觀測性

- `errorService`：定義 `AppError`、錯誤分類、listener pattern。
- `ErrorBoundary` + `ErrorNotificationProvider`：顯示全域錯誤、支援再試與記錄。
- `OfflineStatus`：偵測瀏覽器網路狀態，提示離線/恢復。
- `usePerformanceMonitor` / `useOperationTimer` / `useRenderTracker`：追蹤渲染時間、記憶體、熱點操作。

## 5. 資料生命週期

1. **上傳**：使用者拖放 CSV → `FileUploader` 驗證副檔名/大小/空檔案 → 觸發 `csvService.processFile`。
2. **解析**：`Papa.parse` chunk 解析 → `parseMLine`/`parseDLine` 產生 `Invoice`/`InvoiceItem` → `memoryOptimizer` 分批整合。
3. **入庫**：`store.addFile` (狀態: processing) → 解析成功後 `store.updateFile` + `addInvoices` → `refreshStatistics`。
4. **分析**：Dashboard 自動渲染 `StatisticsCards` 等元件；Analytics 透過 `FilterPanel` 產出 `FilteredData`。
5. **匯出**：使用者選擇欄位/格式 → `exportService` 驗證 + 生成 CSV → `exportProgressService` 更新狀態。
6. **重跑**：File List 重新處理 → `useFileReprocessing` 讀取 base64 `originalFileData` → 再次走解析流程。
7. **持久化**：Zustand `persist` 將 `invoices/files/statistics` 儲存在瀏覽器 storage，確保重新整理後仍可讀取；大型匯出設定由 `exportProgressService` 動態維護。

## 6. 測試與品質策略

| 類型 | 工具 / 位置 | 覆蓋重點 |
| --- | --- | --- |
| 單元測試 | Vitest (`src/lib/__tests__`, `src/components/__tests__`) | `statisticsService`, `csvParser`, UI 邏輯、錯誤處理 |
| 整合測試 | Vitest (`src/test/integration`) | 全流程（檔案上傳 → 統計 → 匯出）模擬 |
| E2E 測試 | Playwright (`e2e/*.spec.ts`) | 真實瀏覽器行為、裝置尺寸 (`responsive-design.spec.ts`)、跨瀏覽器 |
| 品質整合 | `scripts/run-all-tests.js`, `scripts/verify-integration.js` | 聚合測試、覆蓋率、建置、E2E、結構檢查 |
| 監控報告 | `build-report.json`, `test-report.json`, `integration-verification.json` | Bundle 大小、測試結果、結構檢查紀錄 |

**建議流程**：
1. 開發期間跑 `npm run test -- --watch`。
2. 提交前執行 `npm run lint && npm run test:run && npm run test:e2e`。
3. 部署前由 CI 執行 `npm run deploy:check`（含 `test:all` + `build:analyze`）。

## 7. 開發流程與程式碼規範

- **命名**：React 元件 `PascalCase`，檔案/資料夾 `camelCase`（已有自述）。
- **型別**：所有函式/Hook 導出需具備 TypeScript 型別；共用型別集中於 `src/types`。
- **樣式**：優先 Tailwind + shadcn。複用 class 建議收納為 `cn()` helper 或 component prop。
- **副作用**：以 Hook 形式封裝 (`useCSVParser`, `useFileReprocessing`)；避免在元件內直接進行 store mutation。
- **錯誤處理**：優先使用 `errorService` 產生統一訊息，由 `ErrorNotificationProvider` 呈現。
- **格式/靜態檢查**：ESLint + Prettier（`npm run lint`, `npm run format`）。
- **Pull Request 務必附**：
  - 測試結果摘要
  - 若影響 CI 腳本、Docker、文件需同步更新。

## 8. 運維與自動化腳本

| 腳本 | 檔案 | 作用 |
| --- | --- | --- |
| `npm run test:all` | `scripts/run-all-tests.js` | 單元/整合/E2E/覆蓋率/建置一鍵輸出 `test-report.json` 與品質 Gate。|
| `node scripts/verify-integration.js` | `scripts/verify-integration.js` | 檢查關鍵目錄、檔案、依賴、設定並輸出 `integration-verification.json`。|
| `npm run build:analyze` | `scripts/optimize-build.js` | 清除 dist、重建、分析 bundle、列出優化建議、輸出 `build-report.json`。|
| `npm run docker:*` | Dockerfile, docker-compose | 啟動 dev/prod/lb profile，參考 `DEPLOYMENT.md` 取得完整環境設定。|

## 9. 疑難排解備忘

| 症狀 | 可能原因 | 排除建議 |
| --- | --- | --- |
| 上傳檔案立刻失敗 | 副檔名、大小、空檔案、編碼問題 | 查看 `FileUploader` 詳細錯誤；必要時調整 `MAX_FILE_SIZE` 或重新匯出 CSV（UTF-8 / Big5）。|
| 資料解析成功但儀表板無數據 | 檔案不含 M/D 行或全部作廢 | 透過 `FileList` 查看 `invoiceCount`；重新上傳或確認來源。|
| 匯出 PDF 空白 | 圖表尚未渲染完成或瀏覽器阻擋 | 等待圖表載入、改用 CSV 匯出、允許瀏覽器下載。|
| E2E 測試 timeout | Dev server 未啟動或 port 被占用 | 先執行 `npm run build && npm run preview -- --port 4173` 或使用 Playwright `--debug` 模式。|
| Docker 服務無法啟動 | port 衝突 / 記憶體不足 | 參考 `DEPLOYMENT.md` 故障排除章節調整 port 或資源限制。|

## 10. 進階參考

- `src/components/README-ErrorHandling.md`：錯誤處理設計。
- `DEPLOYMENT.md`：系統需求、Docker profile、監控/備份/擴展方案。
- `e2e/*.spec.ts`：使用者旅程自動化腳本。
- `test/sample-invoice.csv` & `e2e/fixtures/*.csv`：本地測試資料。
- `integration-verification.json`：最近一次整合檢查清單，可作為維運基準。

---

若有新的模組、腳本或作業流程，請同步更新本指南與 README，以維持項目知識的一致性。