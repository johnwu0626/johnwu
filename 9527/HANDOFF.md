# 《9527：星際遠征》(9527: Orbital Strike) — Google Play 商店發行交接報告 (HANDOFF)

> **建立日期**：2026-10-18  
> **負責階段**：第一步（Antigravity — 遊戲本體 Play 商店合規、長線養成、自動存檔續戰、原生激勵廣告 Bridge、隱私權政策頁與商店素材）已完成。  
> **下一階段交接對象**：Claude Code（第二步 — Capacitor Android `.aab` 打包、Adaptive Icon 產製與 Google Play Console 上傳配置）。

---

## 一、第一步（Antigravity 已完成項目總覽）

### 1. Google Play 技術審核合規（Technical Compliance）
- **安全區域適配（Safe Area Insets）**：
  - `index.html` 已設定 `viewport-fit=cover`。
  - `style.css` 已對頂部導覽列 `#top-nav`、機庫面板 `.hangar-container`、戰鬥 HUD `#combat-hud` 與右下必殺按鈕 `#btn-combat-bomb` 全面套用 `env(safe-area-inset-top/bottom/left/right)`，避開挖孔螢幕、瀏海與底部手勢橫條。
- **退至背景自動靜音、自動存檔與自動暫停（Background Lifecycle）**：
  - `audio.js` 新增 `suspendAudio()` 與 `resumeAudio()`：退至背景時立即暫停 `<audio>` BGM 並執行 `audioCtx.suspend()`；回到前景繼續戰鬥時自動恢復。
  - `game.js` 綁定 `document.visibilitychange`、`window.pagehide`、`window.blur` 與 `window.beforeunload`：戰鬥中切出 App 或鎖屏時，自動儲存當前遠征進度並彈出暫停選單，完全符合 Google Play「應用程式退至背景不得殘留背景音訊」審核鐵則。
- **Android 實體／手勢返回鍵攔截（Hardware Back Button `popstate`）**：
  - 透過 `history.pushState({ game9527Guard: ... })` 與 `window.addEventListener('popstate')` 攔截返回手勢：
    - 戰鬥中按返回鍵 → 自動儲存並開啟暫停選單（不直接閃退離開 App）。
    - 彈窗開啟中按返回鍵 → 關閉彈窗或恢復戰鬥。
    - 火力展示室按返回鍵 → 安全返回機庫首頁。

### 2. 手遊留存與長線養成系統（Mobile Retention & Meta-Progression）
- **中斷續戰自動存檔（`localStorage` key: `9527_expedition_save_v1`）**：
  - 觸發時機：每關開局、戰鬥中每 3 秒定期存檔、過關結算、開啟暫停或退至背景時。
  - 儲存內容：`stageIdx`、`shipIdx`、`coopMode`、`score`、`stageTime`、`p1Hp`、`p1WeaponLevel`、`p1Bombs`、`savedAt`。
  - 機庫首頁橫幅：若有未完遠征，機庫自動顯示「💾 上次遠征進度：第 XX 關 · 機體 · 積分」與「▶ 繼續遠征」按鈕（`#saved-run-banner`）。
- **星艦科技中樞永久養成（`localStorage` key: `9527_meta_v1`）**：
  - 戰鬥中擊破敵機（`+1~4 💎`）、擊破 Boss（`+35~145 💎`）與通關結算（`+25~113 💎`）皆會即時掉落 **💎 星核晶體**。
  - 點擊頂部導覽列 `💎` 膠囊、機庫底部「⚙️ 科技強化」或結算畫面按鈕，可隨時開啟「⚙️ 星艦科技中樞」升級 6 項永久戰力：
    1. **🛡️ 奈米複合裝甲 (`armor`)**：最大護盾耐久永久提升（每級 +15%，最高 Lv.5）。
    2. **🔥 超導火力核心 (`firepower`)**：主砲與全武器傷害永久提升（每級 +10%，最高 Lv.5）。
    3. **🛸 僚機增幅協定 (`escort`)**：追蹤僚機射速與傷害提升，Lv.3 起解鎖雙聯裝追蹤彈（最高 Lv.5）。
    4. **⚡ 開局武裝預載 (`startLv`)**：出擊時初始武器等級提升（最高開局 Lv.4）。
    5. **💥 戰術彈艙擴容 (`bombCap`)**：必殺炸彈上限與每關初始攜帶量 +1（最高 Lv.2）。
    6. **💎 星核引力增幅 (`bounty`)**：星核晶體與戰鬥積分獲取量 +10%/級，並擴大道具磁吸範圍（最高 Lv.5）。
  - 內建 QA 測試捷徑按鈕 `🛠️ 測試：+500 星核晶體`，方便快速驗證滿級手感。

### 3. 原生激勵廣告 Bridge（`window.GAME9527_AD_BRIDGE`）與 3 大變現版位
- 於 `game.js` 頂部定義 `window.GAME9527_AD_BRIDGE`，內建防連點鎖定、自動靜音／恢復音效，以及 Web 預覽環境 0.9 秒模擬觀看 fallback。
- **3 個激勵廣告版位（Placement IDs）**：
  1. `'revive_in_place'`（任務中止彈窗）：「⚡ 緊急修復：原地滿血復活＋清彈 (每關限 1 次)」— 恢復 100% HP、補 1 顆必殺炸彈、清空全屏敵彈並賦予 3.5 秒無敵。
  2. `'supply_boost'`（關卡突破彈窗）：「🎁 戰前空投：下一關火力 Lv+2 ＆ 護盾全滿」— 為下一關提供滿血與武器直升 2 級（最高 Lv.10）。
  3. `'double_cores'`（關卡突破 ＆ 任務中止彈窗）：「🎬 雙倍領取本關星核晶體」— 本關獲得的 `💎 星核晶體` 立即翻倍入帳。

### 4. 商店素材、隱私權政策頁與無損壓縮驗證
- **隱私權政策頁**：`game/9527/privacy.html`（中英雙語，無收集個資聲明、本機 `localStorage` 說明、AdMob 激勵廣告揭露與資料刪除指引）。
  - 線上網址：`https://johnwu0626.github.io/johnwu/9527/privacy.html`
- **Google Play 商店圖檔素材（`game/9527/assets/store/`）**：
  - `app-icon-512.png` (`338.5 KB`, 512×512 RGB 無透明通道，符合 Play Console 圖示規範) ＆ `app-icon-512.webp` (`243.7 KB`, 無損 WebP)。
  - `feature-graphic-1024x500.png` (`555.3 KB`, 1024×500 RGB 置頂大圖) ＆ `feature-graphic-1024x500.webp` (`396.0 KB`, 無損 WebP)。

---

## 二、第二步（交由 Claude Code 執行：Android `.aab` 打包與 AdMob 串接指令）

請在 Claude Code 執行以下步驟完成 Capacitor Android 封裝與簽章：

### 1. 建議 App 識別設定
- **App 名稱**：`9527：星際遠征`（英文副標：`9527: Orbital Strike`）
- **Application ID (`appId`)**：`com.johnwu.game9527`
- **Web 根目錄 (`webDir`)**：將 `game/9527/` 下的靜態檔案複製到 Capacitor `www/` 或 `dist/`（排除 `.py` 開發腳本即可）。
- **螢幕方向**：於 `AndroidManifest.xml` 的 `<activity>` 設定 `android:screenOrientation="portrait"`（鎖定直式單手操作體驗最佳，亦支援平板自適應）。

### 2. 原生 AdMob 激勵廣告串接介面（選配）
若要接上 `@capacitor-community/admob`，只需在原生啟動腳本注入 `window.GAME9527_NATIVE_REWARDED_AD`，遊戲本體無須修改任何程式碼：

```javascript
window.GAME9527_NATIVE_REWARDED_AD = async function(placement) {
  // placement 會傳入 'revive_in_place' | 'supply_boost' | 'double_cores'
  // 呼叫 AdMob 顯示 Rewarded Video，使用者看完領獎回傳 true，中途關閉回傳 false
  return true;
};
```

### 3. Google Play Console 填表速查
- **類別**：遊戲 (Games) > 街機 (Arcade) / 動作 (Action)
- **隱私權政策網址**：`https://johnwu0626.github.io/johnwu/9527/privacy.html`
- **短描述（80 字內）**：
  > 單手滑動爽快空戰！駕駛 3 大星際戰機迎戰 12 關巨型 Boss，改造星艦科技、釋放全屏必殺！
- **完整描述重點**：
  - 專為手機單手直覺操作設計：按住螢幕任意處滑動即可閃避彈幕並自動連射，雙擊或點擊大鈕釋放全屏必殺技。
  - 3 架專屬星際戰機：蒼穹突擊型（均衡擴散）、破城重砲型（穿透重火力）、稜光折射型（高速追蹤彈）。
  - 12 道星際遠征關卡與雙層裝甲巨型 Boss：突破外殼擊碎核心，體驗極致彈幕與破甲爽感。
  - 星艦科技中樞永久養成：收集星核晶體升級奈米裝甲、超導火力與雙架無敵追蹤僚機，支援隨時中斷自動存檔續戰！
