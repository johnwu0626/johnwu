# vendor/ 依賴登記（decision.md 零外部請求硬條款）

所有執行期依賴一律本地化，頁面不得有任何外部請求（驗收：DevTools Network 0 外部請求）。
更新依賴時：下載新檔 → 更新本表 → 跑 `node --test engine.test.js` ＋開頁 smoke test。

| 檔案 | 套件@版本 | 來源 URL | 下載日期 | 用途 |
|---|---|---|---|---|
| react.production.min.js | react@18.3.1 (UMD) | https://unpkg.com/react@18.3.1/umd/react.production.min.js | 2026/07/11 | UI 框架 |
| react-dom.production.min.js | react-dom@18.3.1 (UMD) | https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js | 2026/07/11 | DOM 渲染 |
| prop-types.min.js | prop-types@15.8.1 | https://unpkg.com/prop-types@15.8.1/prop-types.min.js | 2026/07/11 | Recharts UMD 相依（production stub） |
| Recharts.js | recharts@2.15.0 (UMD) | https://unpkg.com/recharts@2.15.0/umd/Recharts.js | 2026/07/11 | 主圖（雙線＋區帶） |
| babel.min.js | @babel/standalone@7.26.4 | https://unpkg.com/@babel/standalone@7.26.4/babel.min.js | 2026/07/11 | JSX 執行期編譯（v1 裁決；首屏 >1s 改預編譯） |

載入順序（index.html 內固定，不可調換）：react → prop-types → react-dom → Recharts → engine.js → babel。
Recharts UMD 依賴 globals：`React`、`PropTypes`、`ReactDOM`（已驗證其 UMD 檔頭）。
字型不 vendor：使用系統字型堆疊（Noto Sans TC → 微軟正黑體 → system-ui），避免多 MB 字檔。
