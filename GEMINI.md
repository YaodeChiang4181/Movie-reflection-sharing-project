# 專案指引與全域規則 (Project Rules)

## 自動 Git 提交與推送規則 (Auto Git Push Rule)
- 每當完成任何程式碼改動、Bug 修復、功能實作或設定調整並驗證後，**必須自動執行 git add, git commit, 以及 git push origin main**。
- Commit 訊息請遵循 Conventional Commits 規範（如 `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`）。
- 推送完成後主動回報 Commit Hash 與最新遠端同步狀態。
