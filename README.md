# 記憶小鎮 · Memory Town

簡報式單頁網站 — 全螢幕翻頁，無需下拉。

## 預覽

雙擊開啟 `index.html`，或：

```bash
python -m http.server 8080
```

## 操作

- **首頁選單**：點選跳至該章節
- **→ / ← 按鈕** 或 **鍵盤方向鍵**：上一頁 / 下一頁（向左滑動過場）
- 右側圓點：快速跳頁

## 章節順序

首頁 → 世界觀 → 小鎮概況 → 日暮茶行 → 無名花園 → 藏書庫 → 居民 → 昕 → 曚 → 暮 → 鈴 → 朶 → 理 → 霏

## 字體

大標題使用 **Dela Gothic One**（`fonts/DelaGothicOne-Regular.ttf`）。  
若本機有完整 Dela Gothic 繁中版，可替換 `fonts/` 內檔案並更新 `css/deck.css` 的 `@font-face`。

## GitHub Pages

將整個資料夾 push 至 repo 根目錄，Settings → Pages → main branch。
