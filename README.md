# 映後時光 (Movie Reflection Sharing Project)

> 一個以電影心得交流為核心的社群平台，結合網頁端與 LINE Bot 機器人，讓使用者能分享觀影心得、搜尋電影評論、發起觀影揪團活動，並透過豐富的遊戲化機制增加社群黏著度。

## 📖 詳細文件

- **[功能說明文件](功能說明文件.md)** — 完整的功能架構、系統特點、關注數據與更新日誌。

## 技術棧 (Tech Stack)

### Frontend
- React
- Vanilla CSS / CSS Modules
- Lucide React (Icons)

### Backend
- Django / Django REST Framework
- SQLite (開發) / PostgreSQL (正式)
- JWT 身分驗證

### 整合服務
- LINE Bot (Messaging API)
- TMDB API (電影資料)
- Cloudflare R2 (檔案儲存)
- NCU Portal OAuth (校內登入)
