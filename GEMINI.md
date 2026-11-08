# 專案指引與全域規則 (Project Rules)

## 部署環境與全端架構 (Deployment Architecture)
- **雲端部署平台**：全棧（前端 Vite + 後端 Django）**全面部署於 Vercel 環境**（透過 `vercel.json` 進行 monorepo 服務編排與路由分發）。
- **資料庫**：雲端 PostgreSQL（依賴 `DATABASE_URL` / `POSTGRES_URL`，兼顧 Vercel Serverless 無狀態連線管理）。
- **物件儲存**：Cloudflare R2（相容 S3 SigV4 協議，負責使用者頭像與媒體靜態檔案）。
- **Serverless 注意事項**：避免長時間同步阻塞任務與本地檔案寫入，針對資料庫滾動維護優先採用「Django Data Migration」搭配「API 執行期即時修復 (Just-In-Time Rolling)」，以適應 Vercel 執行週期。

## 自動 Git 提交與推送規則 (Auto Git Push Rule)
- 每當完成任何程式碼改動、Bug 修復、功能實作或設定調整並驗證後，**必須自動執行 git add, git commit, 以及 git push origin main**。
- Commit 訊息請遵循 Conventional Commits 規範（如 `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`）。
- 推送完成後主動回報 Commit Hash 與最新遠端同步狀態。
