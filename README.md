# 發票整理儀表板

一個用於管理和分析電子發票資料的現代化儀表板應用程式。

## 功能特色

- 📊 直觀的消費統計儀表板
- 📁 檔案管理和 CSV 發票資料解析
- 📈 時間趨勢和品項分析
- 🔍 進階資料篩選和搜尋
- 📤 資料匯出功能 (CSV/PDF)
- 🎨 現代化響應式設計

## 技術棧

- **前端框架**: React 18 + TypeScript 5
- **狀態管理**: Zustand 4
- **樣式**: Tailwind CSS 3 + shadcn/ui
- **路由**: React Router v6
- **圖表**: Chart.js 4 + react-chartjs-2
- **檔案處理**: PapaParse 5
- **開發環境**: Docker + Vite

## 快速開始

### 使用 Docker (推薦)

1. 確保已安裝 Docker 和 Docker Compose

2. 啟動開發環境：
```bash
docker-compose up
```

3. 開啟瀏覽器訪問 http://localhost:3000

### 本地開發

1. 安裝依賴：
```bash
npm install
```

2. 啟動開發伺服器：
```bash
npm run dev
```

3. 開啟瀏覽器訪問 http://localhost:3000

## 可用指令

- `npm run dev` - 啟動開發伺服器
- `npm run build` - 建置生產版本
- `npm run preview` - 預覽生產版本
- `npm run lint` - 執行 ESLint 檢查
- `npm run lint:fix` - 自動修復 ESLint 問題
- `npm run format` - 格式化程式碼
- `npm run format:check` - 檢查程式碼格式

## Docker 指令

- `docker-compose up` - 啟動開發環境
- `docker-compose up -d` - 背景啟動開發環境
- `docker-compose down` - 停止開發環境
- `docker-compose --profile production up` - 啟動生產環境

## 專案結構

```
src/
├── components/     # 可重用組件
├── pages/         # 頁面組件
├── store/         # Zustand 狀態管理
├── types/         # TypeScript 型別定義
├── lib/           # 工具函數
└── hooks/         # 自定義 React Hooks
```

## 開發指南

1. 遵循 TypeScript 嚴格模式
2. 使用 ESLint 和 Prettier 保持程式碼品質
3. 組件使用 PascalCase 命名
4. 檔案和資料夾使用 camelCase 命名
5. 使用 Tailwind CSS 進行樣式設計

## 常見問題

### 為什麼解析出來的品項名稱會變成數字？

部分電子發票服務在匯出 CSV 時，明細 D 行的欄位順序為「發票號碼 → 金額 → 品項名稱」，而不是傳統的「發票號碼 → 品項名稱 → 金額」。若解析器只假設舊順序，就會把金額欄誤判成品項名稱，導致畫面上顯示出一串數字。為了解決這個問題，`parseDLine` 會檢查第三、第四欄是否為數字，並自動決定哪一個欄位才是品項名稱。這樣不論匯出工具使用哪一種欄位排列，都能正確還原品項資料。 【F:src/lib/csvParser.ts†L246-L288】

## 授權

MIT License