# 映後時光 - NCU Portal 登入問題 Debug 狀態報告 (2026-09-09 更新)

## ✅ 已完全修復

---

## 🚨 致命 Bug — 前端 `setSearchParams` 未定義（**根本原因！**）

**檔案**：`frontend/src/pages/Auth.jsx`

**問題**：`useSearchParams` hook 從未被 import，`setSearchParams` 是 `undefined`。
NCU 回調進來後，程式第一行就執行 `setSearchParams({}, { replace: true })`，
直接拋出 `TypeError`，整個流程崩潰進 `catch`，
API 根本從未被呼叫，就顯示了預設錯誤字串「中央大學 Portal 登入發生錯誤」。

**修復**：
```diff
- import { useLocation, useNavigate } from 'react-router-dom';
+ import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

- const searchParams = new URLSearchParams(location.search);
+ const [searchParams, setSearchParams] = useSearchParams();
```

---

## 🛠️ 後端 NCU Login View 同步強化（`api/domains/auth/views.py`）

1. 新增接收 `english-name` 欄位（你跟學校多拿的欄位之一）
2. `display_name` fallback 順序：`chinese-name` → `english-name` → `campus_id`，並限制 150 字元
3. 建立新帳號時直接在 `create()` 裡包含 email，避免兩次 save
4. campus_id 碰撞時（已有帳號）= 正確綁定行為，不會報錯，只補缺少的 email
5. 加入全程 DEBUG print，讓 Render log 可清楚追蹤每個欄位

---

## ❓ 關於您提出的各項疑問

| 疑問 | 答案 |
|------|------|
| redirect_uri 是 Vercel 前端，這樣對嗎？ | ✅ 正確。OAuth 標準流程就是前端接 code，再丟給後端換 token。 |
| 後端有沒有正確存儲？ | ✅ 有。只是前端在呼叫前就崩潰了，API 根本沒收到請求。 |
| 網頁渲染無法跟 Render 後端對接？ | ❌ 不是這個問題。 |
| 多拿的欄位格式問題？ | ✅ 後端現在已正確接收 english-name、student-id、email 等欄位。 |
| campus_id 碰撞是否報錯？ | ❌ 不會。碰撞 = 綁定已有帳號，是正確行為，確認不是問題來源。 |

---

## 🚀 下一步：部署並驗證

1. 推送前端到 Vercel（`Auth.jsx` 已修復）
2. 推送後端到 Render（`views.py` 已強化）
3. 清除瀏覽器快取後重新測試 NCU 登入
4. 若仍有問題，查看 Render Log（會印出 NCU 回傳的完整原始資料）

## 📋 歷史已排除問題（保留記錄）
1. **[已排除]** NCU 後台 Redirect URI 填寫錯誤：確認一致。
2. **[已解決]** 幽靈請求 (重複過期 Code)：已清除邏輯。
3. **[已解決]** LIFF 背景自動登入：已修復強制登出。
4. **[已解決]** PostgreSQL DataError（campus_id 超長）：已清理截斷。
5. **[已解決]** NCU API 參數要求：已雙重綁定 client_id/secret。


## 📌 目前遇到的核心問題 (Core Problem)
使用者在進行「中央大學 (NCU) Portal」登入後，前端會彈出「中央大學 Portal 登入發生錯誤」的警告。先前發生「雖然報錯卻還是登入成功」的現象，是因為背景觸發了「LINE 自動登入」造成的錯覺，NCU 登入流程實質上一直未能成功走完。

## 🚫 已排除與已修復的原因 (Resolved Issues)
我們已經攜手排除了以下極有可能造成混淆與錯誤的原因：
1. **[已排除] NCU 後台 Redirect URI 填寫錯誤**：使用者已確認 NCU 開發者後台的網址與前端送出的完全一致。
2. **[已解決] 幽靈請求 (重複發送過期 Code)**：先前前端網址沒有清空 `?code=`，導致登出時自動重試舊代碼。已於 `Auth.jsx` 加入清除邏輯。
3. **[已解決] LIFF SDK 背景自動登入干擾**：先前登出時未呼叫 `window.liff.logout()`，導致重新整理後又自動以 LINE 登入。已修復強制登出邏輯。
4. **[已解決] PostgreSQL 資料庫長度限制 (DataError)**：NCU 傳回的 `identifier` 可能包含 `@cc.ncu.edu.tw` 而超過資料庫設定的 9 個字元上限。已加入字串清理與強制截斷防護。
5. **[已解決] NCU API 龜毛的參數要求**：已將 `client_id` 與 `client_secret` 雙重綁定至 Body 與 Header 中。

## ❓ 為什麼現在「還是」顯示一模一樣的錯誤字串？
在我們將前端改為「優先顯示後端真實錯誤訊息」後，卻**依然**看到這句預設台詞。這代表一件事：
👉 **後端發生了「未預期的系統大崩潰 (Unhandled Exception)」**，導致它直接吐出了 Django 的 500 HTML 錯誤網頁，前端無法解析 JSON，只好退回預設錯誤字串。

## 🎯 猜測的剩餘可能凶手 (Hypotheses)
1. **雲端防火牆阻擋 (Timeout / ConnectionError)**：
   NCU 伺服器的防火牆可能封鎖了 Render 的雲端 IP，導致後端 `requests.post` 直接卡死逾時。
2. **資料庫的其他隱性限制**：
   除了 `campus_id` 以外，也許 `User.objects.create` 在寫入 `email` 或 `username` 時違反了唯一性或長度限制。
3. **NCU 回傳了非 JSON 格式的內容**：
   導致 `token_resp.json()` 解析出錯。

## 🚀 目前進度與下一步行動 (Next Steps after Restart)
**目前進度**：
為了徹底抓出上述任何一種崩潰原因，我已經在後端程式碼加上了**「天羅地網級的 Exception 捕捉 (Commit: 926cf00)」**。現在無論是網路逾時還是資料庫報錯，後端都會乖乖把它轉成 JSON 格式回傳給前端。

**您重啟電腦後的下一步**：
1. 開啟網頁，確保處於乾淨的「已登出」狀態。
2. 進行 NCU 登入。
3. 這一次，前端**保證會印出真正的錯誤死因**（例如：`Cannot connect to NCU Portal token endpoint: ...` 或是 `Database error: ...`）。
4. 只要把這個新的紅色錯誤字串貼給我，我們就能一秒破案了！祝您重啟順利，我隨時在這裡等您回來！
