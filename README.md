# 映後時光 (Movie Reflection Sharing Project)

## 專案狀態 (Project Status)

### 2026-10-02 更新
- **UI 調整**: 將電影海報的圓角 (border-radius) 統一調整為 4px (約 5%)，呈現更為方正俐落的視覺效果。
- **功能修正**: 首頁 Hero 輪播區塊，在抓取最新心得留言時，已排除「來自急速評星的無內文評價」之預設文字，確保只顯示真實的使用者留言。

### 2026-10-01 更新
- **UI 色系統一**: 將「片單漂流瓶」功能彈出視窗（Modal）的配色，從原本的深藍色系（Slate/Blue），更改為符合整體網站的主題色系（Warm Black & Gold）。使用了 CSS 變數如 `--bg-primary`, `--bg-secondary`, `--accent-primary` 等取代寫死的顏色。

## 簡介 (Introduction)
這是一個電影心得交流平台。使用者可以透過此平台分享他們的電影觀後感、建立推薦片單，並透過片單漂流瓶功能與其他影迷互動。

## 前端技術棧 (Frontend Tech Stack)
- React
- Vanilla CSS / CSS Modules
- Lucide React (Icons)
