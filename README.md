# 國文錯題本 2025 - 部署指南

這個專案採用 **前後端分離** 的架構：
- **前端 (Frontend)**: React + Vite (本專案的程式碼) -> 部署到 Netlify / GitHub Pages
- **後端 (Backend)**: Google Apps Script (您截圖中的檔案) -> 部署在 Google 雲端

## 1. 關於您的問題：三個檔案都要嗎？

**不需要。**

您在 Google Apps Script 編輯器中看到的 `appsscript.json`, `index.html`, `程式碼.gs` 是屬於 **後端** 的部分。

- **GitHub / Netlify**: 只需要上傳 **本專案資料夾** 中的檔案 (包含 `package.json`, `src/`, `vite.config.ts` 等)。
- **Google Apps Script**: 只需要保留 `程式碼.gs` 來處理資料。`index.html` 在新版架構中已經不再使用 (因為介面已經移到 React 了)，您可以忽略它。

## 2. 如何部署到 Netlify

1. **將本專案推送到 GitHub**
   - 確保 `.gitignore` 包含 `node_modules` (已設定)。
   - Push 到您的 GitHub Repository。

2. **在 Netlify 新增網站**
   - 選擇 "Import from Git"。
   - 連結您的 GitHub Repository。
   - **Build Settings (重要)**:
     - **Build command**: `npm run build`
     - **Publish directory**: `dist`

3. **設定環境變數 (可選)**
   - 由於我們將 API URL 存在使用者的瀏覽器 `localStorage` 中 (透過設定頁面輸入)，所以在 Netlify 上 **不需要** 設定任何環境變數即可運作。

## 3. Google Apps Script 設定 (後端)

1. 回到您的 Google Apps Script 專案。
2. 將 `程式碼.gs` 的內容替換為 APP 設定頁面中提供的 **新版程式碼**。
3. 點擊右上角 **「部署」** -> **「新增部署作業」**。
4. 選擇類型：**「網頁應用程式」**。
5. 設定如下：
   - **執行身分**: 我 (Me)
   - **誰可以存取**: 任何人 (Anyone)
6. 複製產生的 **網頁應用程式網址**。
7. 打開您部署好的 Netlify 網站，進入「設定」頁面，貼上該網址。

## 常見問題

- **Q: 為什麼 Netlify 打開是空白的？**
  - A: 請檢查 Netlify 的 Publish directory 是否設為 `dist`。

- **Q: 為什麼無法讀取資料？**
  - A: 請確認 Google Apps Script 部署時，權限是否設為 **「任何人 (Anyone)」**。如果是「只有我自己」，React App 會無法存取。
