# 發票整理儀表板部署指南

## 概述

本文檔提供發票整理儀表板的完整部署指南，包括開發環境、測試環境和生產環境的部署方式。

## 系統需求

### 最低系統需求
- **CPU**: 2 核心
- **記憶體**: 4GB RAM
- **儲存空間**: 10GB 可用空間
- **作業系統**: Linux (推薦 Ubuntu 20.04+), macOS, Windows 10+

### 推薦系統需求
- **CPU**: 4 核心或以上
- **記憶體**: 8GB RAM 或以上
- **儲存空間**: 20GB 可用空間
- **網路**: 穩定的網際網路連線

## 前置需求

### 必要軟體
1. **Docker** (版本 20.10+)
   ```bash
   # Ubuntu/Debian
   sudo apt-get update
   sudo apt-get install docker.io docker-compose

   # macOS (使用 Homebrew)
   brew install docker docker-compose

   # Windows
   # 下載並安裝 Docker Desktop
   ```

2. **Docker Compose** (版本 2.0+)
   ```bash
   # 驗證安裝
   docker --version
   docker-compose --version
   ```

### 可選軟體
- **Node.js** (版本 20+) - 用於本地開發
- **Git** - 用於版本控制

## 部署方式

### 1. 開發環境部署

#### 快速啟動
```bash
# 克隆專案
git clone <repository-url>
cd invoice-dashboard

# 啟動開發環境
docker-compose --profile dev up -d

# 查看日誌
docker-compose logs -f invoice-dashboard-dev
```

#### 開發環境特性
- **熱重載**: 程式碼變更會自動重新載入
- **除錯支援**: 開放 9229 端口用於 Node.js 除錯
- **開發工具**: 包含完整的開發依賴
- **存取方式**: http://localhost:3000

#### 開發環境指令
```bash
# 停止服務
docker-compose --profile dev down

# 重新建置並啟動
docker-compose --profile dev up -d --build

# 進入容器執行指令
docker exec -it invoice-dashboard-dev sh

# 在容器內執行測試
docker exec invoice-dashboard-dev npm test

# 在容器內執行 E2E 測試
docker exec invoice-dashboard-dev npm run test:e2e
```

### 2. 生產環境部署

#### 方式一：使用 Nginx (推薦)
```bash
# 建置並啟動生產環境 (Nginx)
docker-compose --profile production up -d --build

# 存取方式: http://localhost
```

#### 方式二：使用 Node.js 伺服器
```bash
# 建置並啟動生產環境 (Node.js)
docker-compose --profile production-node up -d --build

# 存取方式: http://localhost:3001
```

#### 方式三：負載平衡器部署
```bash
# 啟動負載平衡器
docker-compose --profile load-balancer up -d --build

# 存取方式: http://localhost:8080
```

### 3. 生產環境最佳化

#### 效能最佳化
- **靜態資源快取**: Nginx 設定 1 年快取期限
- **Gzip 壓縮**: 自動壓縮文字資源
- **程式碼分割**: 自動分割 vendor 和應用程式碼
- **Tree Shaking**: 移除未使用的程式碼

#### 安全性設定
- **安全標頭**: 自動添加安全相關的 HTTP 標頭
- **CSP 政策**: 內容安全政策防止 XSS 攻擊
- **HTTPS 支援**: 可配置 SSL/TLS 憑證

## 環境變數配置

### 開發環境變數
```bash
# .env.development
NODE_ENV=development
VITE_APP_NAME=發票整理儀表板
VITE_APP_VERSION=1.0.0
CHOKIDAR_USEPOLLING=true
WATCHPACK_POLLING=true
```

### 生產環境變數
```bash
# .env.production
NODE_ENV=production
VITE_APP_NAME=發票整理儀表板
VITE_APP_VERSION=1.0.0
```

## 監控和日誌

### 日誌查看
```bash
# 查看所有服務日誌
docker-compose logs

# 查看特定服務日誌
docker-compose logs invoice-dashboard-prod

# 即時查看日誌
docker-compose logs -f invoice-dashboard-prod

# 查看最近 100 行日誌
docker-compose logs --tail=100 invoice-dashboard-prod
```

### 健康檢查
```bash
# 檢查服務狀態
docker-compose ps

# 健康檢查端點
curl http://localhost/health
```

### 效能監控
```bash
# 查看容器資源使用情況
docker stats

# 查看特定容器資源使用
docker stats invoice-dashboard-prod
```

## 備份和還原

### 資料備份
由於應用程式使用瀏覽器本地儲存，主要需要備份：
1. **應用程式程式碼**
2. **設定檔案**
3. **Docker 映像檔**

```bash
# 匯出 Docker 映像檔
docker save -o invoice-dashboard-backup.tar invoice-dashboard:latest

# 備份設定檔案
tar -czf config-backup.tar.gz *.conf *.yml *.json
```

### 資料還原
```bash
# 載入 Docker 映像檔
docker load -i invoice-dashboard-backup.tar

# 還原設定檔案
tar -xzf config-backup.tar.gz
```

## 故障排除

### 常見問題

#### 1. 容器無法啟動
```bash
# 檢查 Docker 服務狀態
sudo systemctl status docker

# 檢查容器日誌
docker-compose logs invoice-dashboard-dev

# 重新建置映像檔
docker-compose build --no-cache
```

#### 2. 端口衝突
```bash
# 檢查端口使用情況
netstat -tulpn | grep :3000

# 修改 docker-compose.yml 中的端口映射
ports:
  - "3001:3000"  # 將本地端口改為 3001
```

#### 3. 記憶體不足
```bash
# 檢查系統記憶體使用
free -h

# 限制容器記憶體使用
docker-compose.yml:
  deploy:
    resources:
      limits:
        memory: 1G
```

#### 4. 檔案權限問題
```bash
# 修正檔案權限
sudo chown -R $USER:$USER .
chmod -R 755 .
```

### 除錯模式

#### 開發環境除錯
```bash
# 啟動除錯模式
docker-compose --profile dev up -d

# 連接除錯器 (使用 VS Code 或其他 IDE)
# 連接到 localhost:9229
```

#### 生產環境除錯
```bash
# 查看詳細日誌
docker-compose logs -f invoice-dashboard-prod

# 進入容器檢查
docker exec -it invoice-dashboard-prod sh
```

## 更新和維護

### 應用程式更新
```bash
# 拉取最新程式碼
git pull origin main

# 重新建置並部署
docker-compose --profile production down
docker-compose --profile production up -d --build
```

### Docker 映像檔更新
```bash
# 清理舊映像檔
docker system prune -a

# 重新建置所有映像檔
docker-compose build --no-cache
```

### 定期維護
```bash
# 每週執行一次清理
docker system prune -f

# 每月檢查磁碟使用情況
df -h
docker system df
```

## 擴展部署

### 水平擴展
```bash
# 啟動多個實例
docker-compose --profile production-node up -d --scale invoice-dashboard-prod-node=3

# 使用負載平衡器
docker-compose --profile load-balancer up -d
```

### 雲端部署

#### AWS 部署
1. 使用 AWS ECS 或 EKS
2. 配置 Application Load Balancer
3. 使用 CloudFront 作為 CDN

#### Google Cloud 部署
1. 使用 Google Cloud Run
2. 配置 Cloud Load Balancing
3. 使用 Cloud CDN

#### Azure 部署
1. 使用 Azure Container Instances
2. 配置 Azure Load Balancer
3. 使用 Azure CDN

## 安全性考量

### 網路安全
- 使用 HTTPS (建議配置 SSL 憑證)
- 設定防火牆規則
- 定期更新系統和依賴

### 應用程式安全
- 定期掃描漏洞
- 更新依賴套件
- 監控異常存取

### 資料安全
- 所有資料僅在瀏覽器本地處理
- 不傳送敏感資料到外部伺服器
- 提供資料清除功能

## 效能調校

### 系統層級
```bash
# 調整 Docker 資源限制
docker-compose.yml:
  deploy:
    resources:
      limits:
        cpus: '2.0'
        memory: 2G
      reservations:
        cpus: '1.0'
        memory: 1G
```

### 應用程式層級
- 啟用 Gzip 壓縮
- 配置適當的快取策略
- 使用 CDN 加速靜態資源

## 支援和聯絡

如果遇到部署問題，請：
1. 檢查本文檔的故障排除章節
2. 查看專案的 GitHub Issues
3. 聯絡開發團隊

---

**注意**: 本部署指南假設您具備基本的 Docker 和系統管理知識。如需更詳細的說明，請參考相關技術文檔。