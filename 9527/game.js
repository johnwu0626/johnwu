// ============================================================================
// 《9527：星際遠征》 手機優先・單指直覺操控與全特效戰鬥引擎 (game.js)
// ============================================================================

import { SHIPS, ENEMY_TYPES, STAGES } from './catalog.js';
import { SoundEngine } from './audio.js';

class SpriteManager {
  constructor() {
    this.images = new Map();
    this.shipSprites = [null, null, null];
    this.ready = false;
  }

  async loadAll() {
    const urls = new Set([
      'ships-realistic-atlas-v1.webp',
      ...Object.values(ENEMY_TYPES).map((e) => e.sprite),
      ...STAGES.map((s) => s.bgSprite),
      ...STAGES.map((s) => s.boss.sprite)
    ]);

    await Promise.all(
      [...urls].map((file) => this.loadImage(file, `assets/sprites/${file}`))
    );

    const atlas = this.images.get('ships-realistic-atlas-v1.webp');
    if (atlas) {
      const w = atlas.width;
      const h = atlas.height;
      const splits = [
        [0, Math.floor(w * 0.318)],
        [Math.floor(w * 0.318), Math.floor(w * 0.684)],
        [Math.floor(w * 0.684), w]
      ];
      splits.forEach(([x0, x1], idx) => {
        this.shipSprites[idx] = this.extractCleanRegion(atlas, x0, 0, x1 - x0, h, true);
      });
    }

    for (const [key, img] of this.images.entries()) {
      if (!key.startsWith('stage-') && key !== 'ships-realistic-atlas-v1.webp') {
        this.images.set(key, this.extractCleanRegion(img, 0, 0, img.width, img.height, true));
      }
    }

    this.ready = true;
  }

  loadImage(key, src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.images.set(key, img);
        resolve(img);
      };
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  extractCleanRegion(source, sx, sy, sw, sh, trim = true) {
    const c = document.createElement('canvas');
    c.width = sw;
    c.height = sh;
    const ctx = c.getContext('2d');
    ctx.drawImage(source, sx, sy, sw, sh, 0, 0, sw, sh);

    const imgData = ctx.getImageData(0, 0, sw, sh);
    const d = imgData.data;

    const cornerAlpha = d[3];
    const cornerBright = (d[0] + d[1] + d[2]) / 3;
    if (cornerAlpha > 200 && cornerBright > 235) {
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2];
        const sat = Math.max(r, g, b) - Math.min(r, g, b);
        const lum = (r + g + b) / 3;
        if (lum > 236 && sat < 26) {
          d[i + 3] = 0;
        } else if (lum > 215 && sat < 35) {
          d[i + 3] = Math.min(d[i + 3], Math.floor(((236 - lum) / 21) * 255));
        }
      }
      ctx.putImageData(imgData, 0, 0);
    }

    if (!trim) return c;

    let minX = sw, minY = sh, maxX = 0, maxY = 0;
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        if (d[(y * sw + x) * 4 + 3] > 18) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX <= minX || maxY <= minY) return c;
    const pad = 4;
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(sw - 1, maxX + pad);
    maxY = Math.min(sh - 1, maxY + pad);

    const tw = maxX - minX + 1;
    const th = maxY - minY + 1;
    const trimmed = document.createElement('canvas');
    trimmed.width = tw;
    trimmed.height = th;
    trimmed.getContext('2d').drawImage(c, minX, minY, tw, th, 0, 0, tw, th);
    return trimmed;
  }
}

class Game9527 {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.sprites = new SpriteManager();
    this.sound = new SoundEngine();

    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.reducedMotion = false;

    this.state = 'hangar';
    this.selectedShips = [0, 1];
    this.selectedStageIdx = 0;
    this.escortEnabled = true;
    this.autoFire = true; // 預設開啟自動連射，手機單指滑動即可遊玩
    this.twoPlayer = false;

    this.players = [];
    this.bullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.pickups = [];
    this.particles = [];
    this.floatTexts = [];
    this.hazards = [];
    this.boss = null;

    this.score = 0;
    this.combo = 1.0;
    this.comboTimer = 0;
    this.stageTime = 0;
    this.uiAnimTime = 0;
    this.spawnTimer = 0;
    this.hazardTimer = 0;
    this.signalBlackoutTimer = 0;
    this.shakeTime = 0;
    this.shakeIntensity = 0;
    this.hitStopTimer = 0;
    this.bombFlashTimer = 0;
    this.bombFlashColor = '#54eaff';
    this.hintFadeTimer = 0;
    this.landingPhase = null;

    this.stars = [];
    this.initStars();

    // 單指相對滑動操控狀態 (Relative Touch Drag：手指不會擋住飛機，也不會瞬移撞彈幕)
    this.keys = new Set();
    this.drag = {
      active: false,
      pointerId: null,
      lastX: 0,
      lastY: 0,
      movedDistance: 0,
      lastTapTime: 0
    };

    this.bindEvents();
    this.updateHangarUI();
    this.buildShowcaseUI();
    this.resize();

    this.sprites.loadAll().then(() => {
      this.updateHangarUI();
    });

    try {
      window.parent?.postMessage({ type: 'tbgofire:9527-ready' }, '*');
      window.tbgofire9527ReturnToMenu = () => this.openHangar();
    } catch (_) {}

    this.lastFrameTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  initStars() {
    this.stars = [];
    for (let i = 0; i < 95; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random(),
        size: 0.8 + Math.random() * 2.1,
        speed: 22 + Math.random() * 95,
        alpha: 0.25 + Math.random() * 0.75,
        hue: Math.random() > 0.7 ? '#9eefff' : Math.random() > 0.5 ? '#ffe4b5' : '#ffffff'
      });
    }
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = Math.floor(this.width * dpr);
    this.canvas.height = Math.floor(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  bindEvents() {
    window.addEventListener('resize', () => this.resize());

    const unlockOnce = () => this.sound.unlock();
    window.addEventListener('pointerdown', unlockOnce, { passive: true });
    window.addEventListener('keydown', unlockOnce, { passive: true });

    window.addEventListener('message', (e) => {
      if (e.data?.type === 'tbgofire:9527-return-menu') this.openHangar();
    });

    // 鍵盤支援 (桌機單雙人)
    window.addEventListener('keydown', (e) => {
      const code = e.code;
      this.keys.add(code);

      if (this.state === 'hangar') {
        if (code === 'KeyA' || code === 'ArrowLeft') this.selectShip(0, (this.selectedShips[0] + 2) % 3);
        else if (code === 'KeyD' || code === 'ArrowRight') this.selectShip(0, (this.selectedShips[0] + 1) % 3);
        else if (code === 'KeyU' || code === 'Space' || code === 'Enter') {
          e.preventDefault();
          this.startCampaign(false);
        } else if (code === 'KeyV') {
          this.startShowcase();
        }
        return;
      }

      if (code === 'Escape') {
        if (this.state === 'playing' || this.state === 'paused') this.togglePause();
        else if (this.state === 'showcase') this.openHangar();
      } else if (code === 'KeyQ') {
        if (this.state !== 'hangar') this.openHangar();
      } else if (code === 'KeyR') {
        if (this.state === 'playing' || this.state === 'gameover' || this.state === 'paused') {
          this.startStage(this.selectedStageIdx);
        }
      } else if (code === 'KeyM') {
        this.toggleMute();
      } else if (code === 'Enter' && (this.state === 'playing' || this.state === 'showcase')) {
        this.joinPlayer2MidGame();
      } else if (code === 'KeyI' || code === 'KeyB' || code === 'ShiftLeft') {
        if (this.state === 'playing' || this.state === 'showcase') {
          this.triggerBomb(this.players[0]);
        }
      } else if (code === 'Period' || code === 'NumpadDecimal' || code === 'KeyK') {
        if ((this.state === 'playing' || this.state === 'showcase') && this.players[1]) {
          this.triggerBomb(this.players[1]);
        }
      }
    });

    window.addEventListener('keyup', (e) => this.keys.delete(e.code));

    // 全螢幕單指相對滑動操控 + 雙擊放炸彈
    this.canvas.addEventListener('pointerdown', (e) => {
      if (this.state !== 'playing' && this.state !== 'showcase') return;
      const now = performance.now();
      if (now - this.drag.lastTapTime < 260) {
        // 雙擊螢幕任意處直接施放必殺炸彈
        this.triggerBomb(this.players[0]);
        this.drag.lastTapTime = 0;
      } else {
        this.drag.lastTapTime = now;
      }

      this.drag.active = true;
      this.drag.pointerId = e.pointerId;
      this.drag.lastX = e.clientX;
      this.drag.lastY = e.clientY;
      this.drag.movedDistance = 0;
      try {
        this.canvas.setPointerCapture(e.pointerId);
      } catch (_) {}
    });

    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.drag.active || e.pointerId !== this.drag.pointerId) return;
      const p1 = this.players[0];
      if (!p1 || !p1.alive) return;

      const dx = e.clientX - this.drag.lastX;
      const dy = e.clientY - this.drag.lastY;
      this.drag.lastX = e.clientX;
      this.drag.lastY = e.clientY;
      this.drag.movedDistance += Math.hypot(dx, dy);

      // 1.18 倍靈敏度相對位移，讓大拇指小幅滑動就能輕鬆橫跨全螢幕
      const sensitivity = 1.18;
      p1.x = Math.max(26, Math.min(this.width - 26, p1.x + dx * sensitivity));
      p1.y = Math.max(66, Math.min(this.height - 36, p1.y + dy * sensitivity));
      p1.bankAngle = Math.max(-0.28, Math.min(0.28, dx * 0.018));

      if (this.drag.movedDistance > 25) {
        const pill = document.getElementById('drag-guide-pill');
        if (pill) pill.style.opacity = '0';
      }
    });

    const endDrag = (e) => {
      if (this.drag.active && (!e || e.pointerId === this.drag.pointerId)) {
        this.drag.active = false;
        this.drag.pointerId = null;
      }
    };
    this.canvas.addEventListener('pointerup', endDrag);
    this.canvas.addEventListener('pointercancel', endDrag);

    // 機庫舞台支援左右滑動切換機體，輕點直接出擊
    const spotlight = document.getElementById('ship-spotlight');
    let swipeStartX = 0;
    spotlight.addEventListener('pointerdown', (e) => {
      swipeStartX = e.clientX;
    });
    spotlight.addEventListener('pointerup', (e) => {
      const diff = e.clientX - swipeStartX;
      if (Math.abs(diff) > 36) {
        const next = diff < 0 ? (this.selectedShips[0] + 1) % 3 : (this.selectedShips[0] + 2) % 3;
        this.selectShip(0, next);
      } else {
        this.startCampaign(false);
      }
    });

    // 綁定三機體切換 Tabs
    document.querySelectorAll('#ship-tabs-container .ship-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.selectShip(0, Number(btn.dataset.index));
      });
    });

    // 綁定選關彈窗與出擊按鈕
    document.getElementById('btn-open-stage-modal').addEventListener('click', () => this.showStageSelectModal());
    document.getElementById('btn-launch-1p').addEventListener('click', () => this.startCampaign(false));
    document.getElementById('btn-launch-2p').addEventListener('click', () => this.startCampaign(true));
    document.getElementById('hangar-btn-showcase').addEventListener('click', () => this.startShowcase());

    // 頂部與右下炸彈按鈕
    document.getElementById('btn-mute-quick').addEventListener('click', () => this.toggleMute());
    document.getElementById('btn-guide').addEventListener('click', () => this.showGuideModal());
    document.getElementById('btn-pause').addEventListener('click', () => this.togglePause());
    document.getElementById('btn-combat-bomb').addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.triggerBomb(this.players[0]);
    });
  }

  toggleMute() {
    this.sound.setMuted(!this.sound.muted);
    document.getElementById('audio-btn-label').textContent = this.sound.muted ? '🔇' : '🔊';
  }

  selectShip(playerIdx, shipIdx) {
    this.selectedShips[playerIdx] = shipIdx;
    this.sound.playSfx('ui_click');
    this.updateHangarUI();
  }

  updateHangarUI() {
    const shipIdx = this.selectedShips[0];
    const ship = SHIPS[shipIdx];

    document.querySelectorAll('#ship-tabs-container .ship-tab-btn').forEach((btn, idx) => {
      btn.classList.toggle('active', idx === shipIdx);
    });

    const nameEl = document.getElementById('sp-ship-name');
    nameEl.textContent = `${ship.id} ${ship.name}`;
    nameEl.style.color = ship.color;
    document.getElementById('sp-ship-role').textContent = ship.role;
    document.getElementById('sp-ship-tagline').textContent = ship.tagline;

    document.getElementById('sp-ship-bars').innerHTML = `
      ${this.renderMiniStat('巡航機動', ship.stats.speed, ship.color)}
      ${this.renderMiniStat('主砲威力', ship.stats.power, ship.color)}
      ${this.renderMiniStat('彈幕範圍', ship.stats.spread, ship.color)}
    `;

    const st = STAGES[this.selectedStageIdx];
    document.getElementById('hangar-stage-label').textContent = `📍 ${st.zoneTitle}`;
  }

  renderMiniStat(label, val, color) {
    return `
      <div class="mini-stat">
        <div class="mini-stat-top"><span>${label}</span><span>${val}</span></div>
        <div class="mini-stat-track">
          <div class="mini-stat-fill" style="width:${val}%;background:${color};box-shadow:0 0 8px ${color};"></div>
        </div>
      </div>
    `;
  }

  renderHangarSpotlight() {
    const c = document.getElementById('spotlight-ship-canvas');
    if (!c) return;
    const ctx = c.getContext('2d');
    const w = c.width, h = c.height;
    ctx.clearRect(0, 0, w, h);

    const shipIdx = this.selectedShips[0];
    const ship = SHIPS[shipIdx];

    ctx.save();
    ctx.translate(w / 2, h / 2 + Math.sin(this.uiAnimTime * 3) * 4);

    // 旋轉全息雷達環
    ctx.save();
    ctx.rotate(this.uiAnimTime * 0.5);
    ctx.strokeStyle = `${ship.color}44`;
    ctx.setLineDash([10, 8]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 76, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 動態推進尾焰
    const flameLen = 24 + Math.sin(this.uiAnimTime * 35) * 6;
    [-14, 14].forEach((ox) => {
      const fg = ctx.createLinearGradient(ox, 42, ox, 42 + flameLen);
      fg.addColorStop(0, '#ffffff');
      fg.addColorStop(0.45, ship.color);
      fg.addColorStop(1, 'transparent');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.moveTo(ox - 6, 40);
      ctx.lineTo(ox + 6, 40);
      ctx.lineTo(ox, 44 + flameLen);
      ctx.closePath();
      ctx.fill();
    });

    // 戰機貼圖
    const sp = this.sprites.shipSprites[shipIdx];
    if (sp) {
      const scale = Math.min(138 / sp.width, 142 / sp.height);
      const dw = sp.width * scale;
      const dh = sp.height * scale;
      ctx.shadowColor = ship.color;
      ctx.shadowBlur = 18;
      ctx.drawImage(sp, -dw / 2, -dh / 2, dw, dh);
    }

    // 雙僚機環繞預覽
    if (this.escortEnabled) {
      [-1, 1].forEach((side) => {
        const ex = side * 66;
        const ey = 12 + Math.sin(this.uiAnimTime * 4 + side) * 5;
        ctx.fillStyle = ship.color;
        ctx.beginPath();
        ctx.moveTo(ex, ey - 9);
        ctx.lineTo(ex + 7, ey + 7);
        ctx.lineTo(ex, ey + 3);
        ctx.lineTo(ex - 7, ey + 7);
        ctx.closePath();
        ctx.fill();
      });
    }

    ctx.restore();
  }

  showStageSelectModal() {
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    let buttonsHtml = '';
    STAGES.forEach((st, idx) => {
      const shortName = st.zoneTitle.split('：')[1] || st.zoneTitle;
      buttonsHtml += `
        <button type="button" class="stage-node-btn ${idx === this.selectedStageIdx ? 'active' : ''}" data-idx="${idx}">
          <span class="stage-node-num">STAGE ${String(st.id).padStart(2, '0')} · ${st.chapter}</span>
          <span class="stage-node-name">${shortName}</span>
          <small style="color:var(--text-muted);font-size:0.68rem;">Boss：${st.boss.name}</small>
        </button>
      `;
    });

    content.innerHTML = `
      <div class="modal-header">
        <h2>🛰 選擇遠征起始關卡</h2>
        <button type="button" class="icon-btn" id="modal-close-stage">關閉</button>
      </div>
      <div class="stage-selector-grid">${buttonsHtml}</div>
    `;
    overlay.classList.remove('hidden');

    content.querySelectorAll('.stage-node-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.selectedStageIdx = Number(btn.dataset.idx);
        this.sound.playSfx('ui_click');
        this.updateHangarUI();
        overlay.classList.add('hidden');
      });
    });

    document.getElementById('modal-close-stage').addEventListener('click', () => {
      overlay.classList.add('hidden');
    });
  }

  buildShowcaseUI() {
    const lvGroup = document.getElementById('sc-lv-buttons');
    lvGroup.innerHTML = '';
    for (let lv = 1; lv <= 10; lv++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `lv-btn ${lv === 5 ? 'active' : ''}`;
      b.textContent = `Lv.${lv}`;
      b.addEventListener('click', () => {
        if (this.players[0]) {
          this.players[0].weaponLevel = lv;
          this.sound.playSfx('power_pickup', { level: lv });
          this.updateShowcaseToolbar();
        }
      });
      lvGroup.appendChild(b);
    }

    const bossSelect = document.getElementById('sc-boss-select');
    STAGES.forEach((st, idx) => {
      const opt = document.createElement('option');
      opt.value = String(idx + 1);
      opt.textContent = `S${String(st.id).padStart(2, '0')} ${st.boss.name}`;
      bossSelect.appendChild(opt);
    });

    bossSelect.addEventListener('change', () => {
      const val = Number(bossSelect.value);
      if (val >= 1) {
        this.selectedStageIdx = val - 1;
        this.boss = null;
        this.spawnStageBoss(STAGES[this.selectedStageIdx]);
      }
    });

    [0, 1, 2].forEach((shipIdx) => {
      document.getElementById(`sc-ship-${shipIdx}`).addEventListener('click', () => {
        this.selectedShips[0] = shipIdx;
        if (this.players[0]) {
          const curLv = this.players[0].weaponLevel;
          this.players[0] = this.createPlayer(0, shipIdx, this.players[0].x, this.players[0].y);
          this.players[0].weaponLevel = curLv;
        }
        this.sound.playSfx('ui_click');
        this.updateShowcaseToolbar();
      });
    });

    document.getElementById('sc-test-bomb').addEventListener('click', () => {
      if (this.players[0]) {
        this.players[0].bombs = Math.max(1, this.players[0].bombs);
        this.triggerBomb(this.players[0]);
      }
    });

    document.getElementById('sc-exit').addEventListener('click', () => this.openHangar());
  }

  updateShowcaseToolbar() {
    const p1 = this.players[0];
    if (!p1) return;
    document.querySelectorAll('#sc-lv-buttons .lv-btn').forEach((btn, idx) => {
      btn.classList.toggle('active', idx + 1 === p1.weaponLevel);
    });
  }

  openHangar() {
    this.state = 'hangar';
    document.getElementById('hangar-screen').classList.remove('hidden');
    document.getElementById('combat-hud').classList.add('hidden');
    document.getElementById('showcase-toolbar').classList.add('hidden');
    document.getElementById('modal-overlay').classList.add('hidden');
    document.getElementById('btn-pause').classList.add('hidden');
    document.getElementById('btn-guide').classList.remove('hidden');
    document.getElementById('signal-glitch').classList.remove('active');
    document.getElementById('top-mode-label').textContent = '星際遠征';
    this.updateHangarUI();
  }

  startCampaign(twoPlayer = false) {
    this.twoPlayer = twoPlayer;
    this.score = 0;
    this.combo = 1.0;
    this.sound.playSfx('launch');
    this.startStage(this.selectedStageIdx, false);
  }

  startShowcase() {
    this.twoPlayer = false;
    this.state = 'showcase';
    document.getElementById('hangar-screen').classList.add('hidden');
    document.getElementById('modal-overlay').classList.add('hidden');
    document.getElementById('combat-hud').classList.remove('hidden');
    document.getElementById('showcase-toolbar').classList.remove('hidden');
    document.getElementById('btn-pause').classList.remove('hidden');
    document.getElementById('btn-guide').classList.add('hidden');
    document.getElementById('combat-bottom-bar').style.display = 'none';
    document.getElementById('top-mode-label').textContent = '火力展示室';

    this.resetStageEntities();
    const p1 = this.createPlayer(0, this.selectedShips[0], this.width * 0.5, this.height * 0.72);
    p1.weaponLevel = 5;
    p1.bombs = 3;
    this.players = [p1];

    const st = STAGES[this.selectedStageIdx];
    this.sound.playBgm(st.bgm);
    this.showHintToast('點擊下方 Lv.1～Lv.10 切換火力，或從選單召喚 Boss 實戰試打！', 5.0);
    this.updateShowcaseToolbar();
    this.updateCombatHUD();
  }

  startStage(stageIdx, keepPlayers = false) {
    this.selectedStageIdx = Math.max(0, Math.min(STAGES.length - 1, stageIdx));
    const st = STAGES[this.selectedStageIdx];
    this.state = 'playing';

    document.getElementById('hangar-screen').classList.add('hidden');
    document.getElementById('modal-overlay').classList.add('hidden');
    document.getElementById('showcase-toolbar').classList.add('hidden');
    document.getElementById('combat-hud').classList.remove('hidden');
    document.getElementById('btn-pause').classList.remove('hidden');
    document.getElementById('btn-guide').classList.add('hidden');
    document.getElementById('combat-bottom-bar').style.display = 'flex';
    document.getElementById('drag-guide-pill').style.opacity = '1';
    document.getElementById('top-mode-label').textContent = st.zoneTitle.split('：')[1] || st.zoneTitle;

    this.resetStageEntities();
    this.showHintToast(`${st.zoneTitle} — ${st.combatHint}`, 4.2);

    if (!keepPlayers || this.players.length === 0) {
      if (this.twoPlayer) {
        this.players = [
          this.createPlayer(0, this.selectedShips[0], this.width * 0.36, this.height * 0.78),
          this.createPlayer(1, this.selectedShips[1], this.width * 0.64, this.height * 0.78)
        ];
      } else {
        this.players = [
          this.createPlayer(0, this.selectedShips[0], this.width * 0.5, this.height * 0.78)
        ];
      }
    } else {
      this.players.forEach((p, idx) => {
        p.x = this.players.length === 2 ? this.width * (idx === 0 ? 0.36 : 0.64) : this.width * 0.5;
        p.y = this.height * 0.78;
        p.hp = p.maxHp;
        p.alive = true;
        p.invuln = 2.0;
      });
    }

    this.sound.playBgm(st.bgm);
    this.addFloatText(this.width / 2, this.height * 0.38, st.zoneTitle, '#54eaff', 22, 2.0);
    this.updateCombatHUD();
  }

  showHintToast(text, duration = 4.0) {
    const banner = document.getElementById('tactical-hint-banner');
    banner.textContent = text;
    banner.classList.remove('fade-out');
    this.hintFadeTimer = duration;
  }

  resetStageEntities() {
    this.bullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.pickups = [];
    this.particles = [];
    this.floatTexts = [];
    this.hazards = [];
    this.boss = null;
    this.landingPhase = null;
    this.stageTime = 0;
    this.spawnTimer = 0.8;
    this.hazardTimer = 3.2;
    this.signalBlackoutTimer = 6.0;
    document.getElementById('boss-hud').classList.add('hidden');
    document.getElementById('boss-warning-banner').classList.add('hidden');
    document.getElementById('signal-glitch').classList.remove('active');
  }

  createPlayer(playerIdx, shipIdx, x, y) {
    return {
      playerIdx,
      shipIdx,
      x,
      y,
      radius: 19,
      hp: 100,
      maxHp: 100,
      weaponLevel: 1,
      bombs: 2,
      maxBombs: 3,
      fireCooldown: 0,
      escortCooldown: 0,
      invuln: 2.0,
      hitFlash: 0,
      alive: true,
      inSlowField: false,
      bankAngle: 0
    };
  }

  joinPlayer2MidGame() {
    if (this.players.length >= 2) {
      if (!this.players[1].alive) {
        this.players[1].alive = true;
        this.players[1].hp = 100;
        this.players[1].bombs = 2;
        this.players[1].invuln = 2.5;
        this.sound.playSfx('launch');
      }
      return;
    }
    this.twoPlayer = true;
    const p2 = this.createPlayer(1, this.selectedShips[1], this.width * 0.64, this.height * 0.78);
    this.players.push(p2);
    this.sound.playSfx('launch');
    this.addFloatText(p2.x, p2.y - 30, 'P2 參戰！', '#c99bff', 18, 1.5);
    this.updateCombatHUD();
  }

  firePlayerWeapons(p, dt) {
    const ship = SHIPS[p.shipIdx];
    const cooldownMult = p.inSlowField ? 1.25 : 1.0;
    p.fireCooldown -= dt;
    p.escortCooldown -= dt;

    if (p.fireCooldown <= 0) {
      const lv = p.weaponLevel;
      const dmgScale = 1 + (lv - 1) * 0.14;
      const baseDmg = ship.shotDamage * dmgScale;
      const spd = ship.shotSpeed;
      p.fireCooldown = ship.fireInterval * cooldownMult;

      const pan = ((p.x / this.width) - 0.5) * 1.4;
      this.sound.playSfx(ship.shotSound, { pan, volume: 0.68 });

      if (ship.pattern === 'twin') {
        const lanes = lv >= 7 ? 5 : lv >= 5 ? 4 : lv >= 3 ? 3 : 2;
        const pierce = lv >= 6 ? (lv >= 9 ? 2 : 1) : 0;
        const spacing = 12;
        for (let i = 0; i < lanes; i++) {
          const offset = (i - (lanes - 1) / 2) * spacing;
          const angle = -Math.PI / 2 + offset * 0.0025;
          this.bullets.push({
            x: p.x + offset,
            y: p.y - 24,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            damage: baseDmg * 0.52,
            color: ship.color,
            accent: ship.accent,
            radius: lv >= 6 && i === Math.floor(lanes / 2) ? 7 : 5,
            style: 'lance',
            pierces: pierce,
            homing: false
          });
        }
        if (lv >= 2) {
          const seekers = lv >= 9 ? 4 : lv >= 5 ? 2 : 1;
          for (let s = 0; s < seekers; s++) {
            const side = s % 2 === 0 ? -1 : 1;
            const spreadIdx = Math.floor(s / 2) + 1;
            this.bullets.push({
              x: p.x + side * 24 * spreadIdx,
              y: p.y - 8,
              vx: side * (110 + spreadIdx * 45),
              vy: -spd * 0.75,
              damage: baseDmg * 0.46,
              color: '#8ce9c5',
              accent: '#ffffff',
              radius: 5,
              style: 'seeker',
              pierces: 0,
              homing: true,
              turnRate: 6.5
            });
          }
        }
      } else if (ship.pattern === 'spread') {
        const count = lv >= 10 ? 9 : lv >= 7 ? 7 : lv >= 3 ? 5 : 3;
        const arc = lv >= 7 ? 0.68 : 0.48;
        for (let i = 0; i < count; i++) {
          const ratio = count === 1 ? 0 : (i / (count - 1)) - 0.5;
          const angle = -Math.PI / 2 + ratio * arc;
          const isCenter = Math.abs(ratio) < 0.05;
          this.bullets.push({
            x: p.x + ratio * 20,
            y: p.y - 22,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            damage: baseDmg * (isCenter && lv >= 5 ? 0.68 : 0.42),
            color: ship.color,
            accent: ship.accent,
            radius: isCenter && lv >= 5 ? 7 : 5,
            style: 'prism',
            pierces: isCenter && lv >= 5 ? 2 : 0,
            homing: false
          });
        }
        if (lv >= 2) {
          const facets = lv >= 6 ? 4 : 2;
          for (let f = 0; f < facets; f++) {
            const side = f % 2 === 0 ? -1 : 1;
            const tier = Math.floor(f / 2) + 1;
            this.bullets.push({
              x: p.x + side * (32 + tier * 14),
              y: p.y - 6 + tier * 8,
              vx: Math.cos(-Math.PI / 2 - side * 0.12) * (spd * 0.92),
              vy: Math.sin(-Math.PI / 2 - side * 0.12) * (spd * 0.92),
              damage: baseDmg * 0.38,
              color: '#9af0e7',
              accent: '#ffffff',
              radius: 5,
              style: 'facet',
              pierces: 0,
              homing: true,
              turnRate: 3.2
            });
          }
        }
      } else {
        const mainCount = lv >= 9 ? 3 : lv >= 5 ? 2 : 1;
        const pierce = lv >= 7 ? 3 : lv >= 3 ? 2 : 1;
        for (let i = 0; i < mainCount; i++) {
          const offset = (i - (mainCount - 1) / 2) * 16;
          this.bullets.push({
            x: p.x + offset,
            y: p.y - 26,
            vx: 0,
            vy: -spd,
            damage: baseDmg * (mainCount === 1 ? 1.15 : 0.72),
            color: ship.color,
            accent: ship.accent,
            radius: lv >= 3 ? 9 : 7,
            style: 'cannon',
            pierces: pierce,
            homing: false,
            shrapnel: lv >= 6
          });
        }
        if (lv >= 2) {
          const guards = lv >= 7 ? 4 : 2;
          for (let g = 0; g < guards; g++) {
            const side = g % 2 === 0 ? -1 : 1;
            const tier = Math.floor(g / 2) + 1;
            const angle = -Math.PI / 2 + side * (0.06 * tier);
            this.bullets.push({
              x: p.x + side * (26 + tier * 10),
              y: p.y - 10,
              vx: Math.cos(angle) * (spd * 0.86),
              vy: Math.sin(angle) * (spd * 0.86),
              damage: baseDmg * 0.45,
              color: '#ffd079',
              accent: '#fff5d8',
              radius: 6,
              style: 'guard',
              pierces: 0,
              homing: false
            });
          }
        }
      }
    }

    if (this.escortEnabled && p.escortCooldown <= 0) {
      p.escortCooldown = 0.34 * cooldownMult;
      const dual = p.weaponLevel >= 6;
      const orbitAngle = this.stageTime * 3.2;
      [-1, 1].forEach((side) => {
        const ex = p.x + side * 44 + Math.cos(orbitAngle + side) * 5;
        const ey = p.y + 6 + Math.sin(orbitAngle + side) * 5;
        (dual ? [-4, 4] : [0]).forEach((ox) => {
          this.bullets.push({
            x: ex + ox,
            y: ey - 10,
            vx: side * 35,
            vy: -760,
            damage: 3.4 + p.weaponLevel * 0.45,
            color: '#7fe9ff',
            accent: '#ffffff',
            radius: 4.5,
            style: 'seeker',
            pierces: 0,
            homing: true,
            turnRate: 5.8
          });
        });
      });
    }
  }

  triggerBomb(p) {
    if (!p || !p.alive || p.bombs <= 0) return;
    p.bombs -= 1;
    p.invuln = Math.max(p.invuln, 2.6);

    const ship = SHIPS[p.shipIdx];
    this.sound.playSfx(ship.bombSound, { volume: 1.0 });
    this.bombFlashTimer = 0.75;
    this.bombFlashColor = ship.bombColor;
    this.triggerShake(14, 0.55);

    this.enemyBullets.forEach((b) => {
      this.spawnExplosion(b.x, b.y, ship.color, 4, 90);
      this.score += 15;
    });
    this.enemyBullets = [];

    this.enemies.forEach((e) => {
      e.hp -= ship.bombDamage;
      e.hitFlash = 0.25;
    });

    if (this.boss && this.boss.active) {
      this.damageBoss(ship.bombDamage * 1.35);
    }

    for (let i = 0; i < 38; i++) {
      const ang = (Math.PI * 2 * i) / 38;
      const spd = 200 + Math.random() * 480;
      this.particles.push({
        x: p.x,
        y: p.y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        size: 4 + Math.random() * 5,
        color: ship.bombColor,
        life: 0.6 + Math.random() * 0.35,
        maxLife: 0.95
      });
    }

    this.addFloatText(p.x, p.y - 45, `★ ${ship.bombName} ★`, ship.accent, 20, 1.4);
    this.updateCombatHUD();
  }

  spawnEnemyWave(st) {
    const pool = st.enemyPool;
    const kindKey = pool[Math.floor(Math.random() * pool.length)];
    const def = ENEMY_TYPES[kindKey] || ENEMY_TYPES.scout;

    const count = kindKey === 'bomber' || kindKey === 'orbital_turret' ? 1 : Math.random() > 0.45 ? 3 : 2;
    const margin = Math.min(70, this.width * 0.14);
    const baseX = margin + Math.random() * (this.width - margin * 2);
    const stageMult = 1 + this.selectedStageIdx * 0.16;

    for (let i = 0; i < count; i++) {
      const ex = Math.max(40, Math.min(this.width - 40, baseX + (i - (count - 1) / 2) * 68));
      const ey = -30 - i * 28;
      this.enemies.push({
        kind: kindKey,
        name: def.name,
        sprite: def.sprite,
        x: ex,
        y: ey,
        vx: (Math.random() - 0.5) * 55,
        vy: def.speed,
        baseVy: def.speed,
        hoverY: def.hoverY || null,
        guaranteedDrop: Boolean(def.guaranteedDrop),
        hp: Math.round(def.hp * stageMult),
        maxHp: Math.round(def.hp * stageMult),
        radius: def.radius,
        score: def.score,
        color: def.color,
        fireTimer: 0.45 + Math.random() * (def.fireInterval * 0.6),
        fireInterval: def.fireInterval,
        bulletSpeed: def.bulletSpeed,
        pattern: def.pattern,
        rotates: Boolean(def.rotates),
        rotation: 0,
        age: 0,
        hitFlash: 0
      });
    }
  }

  spawnEnvironmentalHazard(st) {
    if (!st.hazards || st.hazards.length === 0) return;
    const hType = st.hazards[Math.floor(Math.random() * st.hazards.length)];

    if (hType === 'debris_warning' || hType === 'meteor_lanes') {
      const lx = 50 + Math.random() * (this.width - 100);
      this.hazards.push({
        type: 'meteor_lane',
        x: lx,
        width: 52,
        timer: 0,
        warningTime: 1.35,
        spawned: false
      });
    } else if (hType === 'solar_wind') {
      const bw = Math.min(200, this.width * 0.36);
      const bx = 30 + Math.random() * (this.width - 60 - bw);
      this.hazards.push({
        type: 'solar_wind',
        x: bx,
        width: bw,
        timer: 0,
        warningTime: 1.2,
        duration: 5.5
      });
    } else if (hType === 'thermal_streams') {
      const corridorW = Math.max(160, this.width * 0.42);
      const corridorX = 30 + Math.random() * (this.width - 60 - corridorW);
      this.hazards.push({
        type: 'thermal_corridor',
        corridorX,
        corridorW,
        timer: 0,
        warningTime: 1.3,
        duration: 6.0
      });
    }
  }

  spawnStageBoss(st) {
    if (this.boss) return;
    const bDef = st.boss;
    const maxRadius = Math.min(bDef.radius, this.width * 0.19);
    this.boss = {
      name: bDef.name,
      enName: bDef.enName,
      sprite: bDef.sprite,
      x: this.width / 2,
      y: -130,
      targetY: Math.min(165, this.height * 0.22),
      shellHp: bDef.shellHp,
      maxShellHp: bDef.shellHp,
      coreHp: bDef.coreHp,
      maxCoreHp: bDef.coreHp,
      radius: maxRadius,
      color: bDef.color,
      patterns: bDef.patterns,
      active: true,
      entering: true,
      warningTimer: 2.3,
      attackTimer: 1.5,
      patternIdx: 0,
      phaseAngle: 0,
      hitFlash: 0,
      shellBroken: false
    };

    this.sound.playSfx('boss_warning', { volume: 0.95 });
    const warnBanner = document.getElementById('boss-warning-banner');
    document.getElementById('boss-warning-name').textContent = `目標：${bDef.name}`;
    warnBanner.classList.remove('hidden');

    const bossHud = document.getElementById('boss-hud');
    document.getElementById('boss-hud-name').textContent = `BOSS // ${bDef.name}`;
    document.getElementById('boss-hud-status').textContent = '外殼護甲';
    bossHud.classList.remove('hidden');
    this.updateBossHUD();
  }

  damageBoss(dmg) {
    if (!this.boss || !this.boss.active) return;
    const b = this.boss;
    b.hitFlash = 0.09;

    if (b.shellHp > 0) {
      b.shellHp = Math.max(0, b.shellHp - dmg);
      if (b.shellHp === 0 && !b.shellBroken) {
        b.shellBroken = true;
        this.sound.playSfx('shell_break', { volume: 1.0 });
        this.triggerShake(12, 0.45);
        this.hitStopTimer = this.reducedMotion ? 0 : 0.06;
        this.spawnExplosion(b.x, b.y, '#ffdf7e', 30, 300);
        this.addFloatText(b.x, b.y, '⚡ 外殼擊碎！核心暴露 ⚡', '#ffdf7e', 18, 1.8);
        document.getElementById('boss-hud-status').textContent = '⚠ 核心暴露';
      }
    } else {
      b.coreHp = Math.max(0, b.coreHp - dmg);
      if (b.coreHp === 0) this.onBossDefeated();
    }
    this.updateBossHUD();
  }

  onBossDefeated() {
    const b = this.boss;
    if (!b) return;
    b.active = false;
    this.sound.playSfx('boss_destroy', { volume: 1.0 });
    this.triggerShake(18, 0.85);
    this.hitStopTimer = this.reducedMotion ? 0 : 0.09;
    this.enemyBullets = [];
    this.enemies = [];

    for (let i = 0; i < 55; i++) {
      const ox = (Math.random() - 0.5) * b.radius * 1.6;
      const oy = (Math.random() - 0.5) * b.radius * 1.2;
      this.spawnExplosion(b.x + ox, b.y + oy, i % 2 === 0 ? '#ff9f43' : '#ff2a55', 6, 320);
    }

    this.score += Math.round(5000 * this.combo);
    document.getElementById('boss-hud').classList.add('hidden');
    document.getElementById('boss-warning-banner').classList.add('hidden');

    if (this.state === 'showcase') {
      this.addFloatText(b.x, b.y, `${b.name} 擊破！`, '#42f5aa', 20, 2.0);
      this.boss = null;
      return;
    }

    const st = STAGES[this.selectedStageIdx];
    this.boss = null;

    if (st.safeLanding) {
      this.beginMarsLandingSequence();
    } else {
      this.completeCurrentStage();
    }
  }

  beginMarsLandingSequence() {
    const corridorW = Math.max(180, this.width * 0.45);
    this.landingPhase = {
      timer: 0,
      duration: 6.0,
      corridorX: (this.width - corridorW) / 2,
      corridorW,
      beaconPulse: 0
    };
    this.showHintToast('【最終著陸】請保持在中央琥珀信標安全廊道內，降落曙光前哨站！', 5.5);
  }

  completeCurrentStage() {
    const st = STAGES[this.selectedStageIdx];
    if (st.clearResupplyBomb) {
      this.players.forEach((p) => {
        p.bombs = Math.min(p.maxBombs, p.bombs + st.clearResupplyBomb);
      });
    }

    if (this.selectedStageIdx >= STAGES.length - 1) {
      this.state = 'victory';
      this.showStageClearModal(st, true);
    } else {
      this.state = 'stage_clear';
      this.showStageClearModal(st, false);
    }
  }

  fireBossPattern(b, st) {
    const isMirrorStage = st.hazards?.includes('mirror_bullets');
    const pat = b.patterns[b.patternIdx % b.patterns.length];
    b.patternIdx++;
    b.phaseAngle += 0.35;

    const pTarget = this.players.find((p) => p.alive) || { x: this.width / 2, y: this.height * 0.8 };
    const aimAngle = Math.atan2(pTarget.y - b.y, pTarget.x - b.x);
    const enraged = b.shellBroken;
    const spd = enraged ? 290 : 240;

    if (pat === 'fan5' || pat === 'gatekeeper_wing_fan' || pat === 'thermal_net_fan') {
      const count = enraged ? 9 : 7;
      const spread = 1.1;
      for (let i = 0; i < count; i++) {
        const a = aimAngle + ((i / (count - 1)) - 0.5) * spread;
        this.spawnEnemyBullet(b.x, b.y + 34, Math.cos(a) * spd, Math.sin(a) * spd, b.color, isMirrorStage);
      }
    } else if (pat === 'rotating_fan' || pat === 'alternating_fan' || pat === 'mirror_fan') {
      const arms = enraged ? 11 : 8;
      for (let i = 0; i < arms; i++) {
        const a = b.phaseAngle + (Math.PI * 2 * i) / arms;
        this.spawnEnemyBullet(
          b.x,
          b.y + 28,
          Math.cos(a) * spd,
          Math.abs(Math.sin(a)) * spd * 0.85 + 85,
          isMirrorStage ? '#9af0e7' : b.color,
          true
        );
      }
    } else if (pat === 'TwinSweep' || pat === 'multi_barrel' || pat === 'collector_triads' || pat === 'solar_sail_triads') {
      [-42, 0, 42].forEach((ox) => {
        for (let k = -1; k <= 1; k++) {
          const a = Math.PI / 2 + k * 0.22 + Math.sin(b.phaseAngle) * 0.18;
          this.spawnEnemyBullet(b.x + ox, b.y + 36, Math.cos(a) * spd, Math.sin(a) * spd, '#ffd079', isMirrorStage);
        }
      });
    } else {
      const count = enraged ? 14 : 10;
      for (let i = 0; i < count; i++) {
        const a = b.phaseAngle + (Math.PI * 2 * i) / count;
        this.spawnEnemyBullet(b.x, b.y + 22, Math.cos(a) * spd, Math.sin(a) * spd, '#ff7597', isMirrorStage);
      }
    }
  }

  spawnEnemyBullet(x, y, vx, vy, color = '#ff628d', mirrorBounce = false) {
    this.enemyBullets.push({
      x,
      y,
      vx,
      vy,
      radius: 5.5,
      color,
      mirrorBounce,
      bounced: false
    });
  }

  loop(now) {
    const rawDt = Math.min(0.05, (now - this.lastFrameTime) / 1000);
    this.lastFrameTime = now;
    this.uiAnimTime += rawDt;

    if (this.state === 'hangar') {
      this.stageTime += rawDt * 0.4;
      this.renderHangarSpotlight();
    } else if (this.hitStopTimer > 0) {
      this.hitStopTimer -= rawDt;
    } else if (this.state === 'playing' || this.state === 'showcase') {
      this.update(rawDt);
    }

    this.render();
    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    const st = STAGES[this.selectedStageIdx];
    this.stageTime += dt;

    if (this.shakeTime > 0) this.shakeTime = Math.max(0, this.shakeTime - dt);
    if (this.bombFlashTimer > 0) this.bombFlashTimer = Math.max(0, this.bombFlashTimer - dt);

    if (this.hintFadeTimer > 0) {
      this.hintFadeTimer -= dt;
      if (this.hintFadeTimer <= 0) {
        document.getElementById('tactical-hint-banner').classList.add('fade-out');
      }
    }

    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = Math.max(1.0, +(this.combo - 0.5).toFixed(1));
    }

    if (st.hazards?.includes('signal_blackout') && this.state === 'playing') {
      this.signalBlackoutTimer -= dt;
      const glitchEl = document.getElementById('signal-glitch');
      if (this.signalBlackoutTimer <= 0) {
        glitchEl.classList.add('active');
        if (this.signalBlackoutTimer <= -1.0) {
          glitchEl.classList.remove('active');
          this.signalBlackoutTimer = 7.5 + Math.random() * 4;
        }
      }
    }

    if (this.landingPhase) {
      this.landingPhase.timer += dt;
      if (Math.floor((this.landingPhase.timer - dt) * 2) !== Math.floor(this.landingPhase.timer * 2)) {
        this.sound.playSfx('beacon', { volume: 0.35 });
      }
      if (this.landingPhase.timer >= this.landingPhase.duration) {
        this.landingPhase = null;
        this.completeCurrentStage();
        return;
      }
    }

    if (this.state === 'playing' && !this.landingPhase) {
      if (!this.boss) {
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
          this.spawnEnemyWave(st);
          this.spawnTimer = Math.max(1.05, 2.2 - this.selectedStageIdx * 0.06);
        }
        if (this.stageTime >= st.bossTime) {
          this.spawnStageBoss(st);
        }
      }

      this.hazardTimer -= dt;
      if (this.hazardTimer <= 0) {
        this.spawnEnvironmentalHazard(st);
        this.hazardTimer = 6.5 + Math.random() * 3.0;
      }
    }

    this.players.forEach((p) => { p.inSlowField = false; });
    this.hazards = this.hazards.filter((h) => {
      h.timer += dt;
      if (h.type === 'meteor_lane') {
        if (h.timer >= h.warningTime && !h.spawned) {
          h.spawned = true;
          const def = ENEMY_TYPES.debris;
          this.enemies.push({
            kind: 'debris',
            name: def.name,
            sprite: def.sprite,
            x: h.x,
            y: -40,
            vx: 0,
            vy: 440,
            hp: def.hp,
            maxHp: def.hp,
            radius: def.radius,
            score: def.score,
            color: def.color,
            fireTimer: 999,
            fireInterval: 999,
            bulletSpeed: 0,
            pattern: 'none',
            rotates: true,
            rotation: 0,
            age: 0,
            hitFlash: 0
          });
        }
        return h.timer < h.warningTime + 0.4;
      } else if (h.type === 'solar_wind') {
        if (h.timer >= h.warningTime) {
          this.players.forEach((p) => {
            if (p.alive && p.x >= h.x && p.x <= h.x + h.width) p.inSlowField = true;
          });
        }
        return h.timer < h.warningTime + h.duration;
      } else if (h.type === 'thermal_corridor') {
        if (h.timer >= h.warningTime) {
          this.players.forEach((p) => {
            if (p.alive && (p.x < h.corridorX || p.x > h.corridorX + h.corridorW)) p.inSlowField = true;
          });
        }
        return h.timer < h.warningTime + h.duration;
      }
      return false;
    });

    this.players.forEach((p) => {
      if (!p.alive) return;
      if (p.invuln > 0) p.invuln = Math.max(0, p.invuln - dt);
      if (p.hitFlash > 0) p.hitFlash = Math.max(0, p.hitFlash - dt);

      const ship = SHIPS[p.shipIdx];
      let mx = 0, my = 0;

      if (p.playerIdx === 0) {
        if (this.keys.has('KeyA')) mx -= 1;
        if (this.keys.has('KeyD')) mx += 1;
        if (this.keys.has('KeyW')) my -= 1;
        if (this.keys.has('KeyS')) my += 1;
        if (this.players.length === 1) {
          if (this.keys.has('ArrowLeft')) mx -= 1;
          if (this.keys.has('ArrowRight')) mx += 1;
          if (this.keys.has('ArrowUp')) my -= 1;
          if (this.keys.has('ArrowDown')) my += 1;
        }
      } else {
        if (this.keys.has('ArrowLeft')) mx -= 1;
        if (this.keys.has('ArrowRight')) mx += 1;
        if (this.keys.has('ArrowUp')) my -= 1;
        if (this.keys.has('ArrowDown')) my += 1;
      }

      const len = Math.hypot(mx, my);
      if (len > 0.01) {
        p.x += (mx / len) * ship.speed * dt;
        p.y += (my / len) * ship.speed * dt;
        p.bankAngle = (mx / len) * 0.22;
      } else if (!this.drag.active) {
        p.bankAngle *= 0.85;
      }

      p.x = Math.max(26, Math.min(this.width - 26, p.x));
      p.y = Math.max(66, Math.min(this.height - 36, p.y));

      if (!this.landingPhase) {
        this.firePlayerWeapons(p, dt);
      }
    });

    this.bullets = this.bullets.filter((b) => {
      if (b.homing) {
        let target = this.boss && this.boss.active && !this.boss.entering ? this.boss : null;
        let minDist = target ? Math.hypot(target.x - b.x, target.y - b.y) : Infinity;
        for (const e of this.enemies) {
          if (e.y < 42) continue; // 進場前不鎖定，確保敵機完整飛入畫面後才接戰
          const d = Math.hypot(e.x - b.x, e.y - b.y);
          if (d < minDist) {
            minDist = d;
            target = e;
          }
        }
        if (target) {
          const desired = Math.atan2(target.y - b.y, target.x - b.x);
          const cur = Math.atan2(b.vy, b.vx);
          let diff = desired - cur;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          const nextAngle = cur + Math.max(-b.turnRate * dt, Math.min(b.turnRate * dt, diff));
          const spd = Math.hypot(b.vx, b.vy);
          b.vx = Math.cos(nextAngle) * spd;
          b.vy = Math.sin(nextAngle) * spd;
        }
      }

      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // 子彈飛抵頂部邊緣即消散，避免在畫面外提前擊殺尚未露面的敵機
      if (b.y < 14 || b.y > this.height + 40 || b.x < -40 || b.x > this.width + 40) return false;

      for (const e of this.enemies) {
        if (e.y < 38) continue; // 進場保護：敵機完全進入可視區後才吃傷害
        if (e.hp > 0 && Math.hypot(e.x - b.x, e.y - b.y) < e.radius + b.radius) {
          e.hp -= b.damage;
          e.hitFlash = 0.08;
          this.sound.playSfx('enemy_hit', { volume: 0.42 });
          this.spawnHitSparks(b.x, b.y, b.color);
          if (b.shrapnel) this.spawnExplosion(b.x, b.y, '#ffb36b', 4, 120);
          if (b.pierces > 0) b.pierces--;
          else return false;
        }
      }

      if (this.boss && this.boss.active && !this.boss.entering) {
        if (Math.hypot(this.boss.x - b.x, this.boss.y - b.y) < this.boss.radius + b.radius) {
          this.damageBoss(b.damage);
          this.sound.playSfx('boss_hit', { volume: 0.48 });
          this.spawnHitSparks(b.x, b.y, b.color);
          if (b.pierces > 0) b.pierces--;
          else return false;
        }
      }

      return true;
    });

    this.enemies = this.enemies.filter((e) => {
      e.age += dt;
      if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - dt);
      if (e.rotates) e.rotation += dt * 2.2;

      // 進場衝刺：在 y < 52 時快速入鏡，入鏡後若為中型/重型敵機則在懸停高度展開壓制交火
      let currentVy = e.baseVy || e.vy;
      if (e.y < 52) {
        currentVy = Math.max(currentVy * 1.85, 220);
      } else if (e.hoverY && e.age < 7.2) {
        const targetHoverY = this.height * e.hoverY;
        if (e.y >= targetHoverY) {
          currentVy = Math.sin(e.age * 2.0) * 18;
        } else {
          currentVy = Math.max(45, (targetHoverY - e.y) * 2.2);
        }
      }

      e.x += Math.sin(e.age * 2.4) * 52 * dt + e.vx * dt;
      e.x = Math.max(34, Math.min(this.width - 34, e.x));
      if (e.x <= 36 || e.x >= this.width - 36) e.vx = -e.vx;
      e.y += currentVy * dt;

      e.fireTimer -= dt;
      if (e.fireTimer <= 0 && e.y > 42 && e.y < this.height * 0.72) {
        e.fireTimer = e.fireInterval;
        this.fireEnemyWeapon(e, st);
      }

      for (const p of this.players) {
        if (p.alive && p.invuln <= 0 && Math.hypot(p.x - e.x, p.y - e.y) < p.radius + e.radius * 0.72) {
          this.damagePlayer(p, 25);
          e.hp -= 85;
        }
      }

      if (e.hp <= 0) {
        this.sound.playSfx('enemy_destroy', { volume: 0.72 });
        this.spawnExplosion(e.x, e.y, e.color, 15, 230);
        this.combo = Math.min(8.0, +(this.combo + 0.2).toFixed(1));
        this.comboTimer = 4.0;
        const pts = Math.round(e.score * this.combo);
        this.score += pts;
        this.addFloatText(e.x, e.y, `+${pts}`, '#ffffff', 13, 0.8);
        this.maybeDropPickup(e.x, e.y, e.guaranteedDrop);
        return false;
      }

      return e.y < this.height + 80;
    });

    if (this.boss && this.boss.active) {
      const b = this.boss;
      if (b.hitFlash > 0) b.hitFlash = Math.max(0, b.hitFlash - dt);
      if (b.warningTimer > 0) {
        b.warningTimer -= dt;
        if (b.warningTimer <= 0) {
          document.getElementById('boss-warning-banner').classList.add('hidden');
        }
      }

      if (b.entering) {
        b.y += (b.targetY - b.y) * Math.min(1, dt * 3.2);
        if (Math.abs(b.y - b.targetY) < 4) {
          b.y = b.targetY;
          b.entering = false;
        }
      } else {
        b.x = this.width / 2 + Math.sin(this.stageTime * 1.15) * Math.min(180, this.width * 0.28);
        b.attackTimer -= dt;
        if (b.attackTimer <= 0) {
          this.fireBossPattern(b, st);
          b.attackTimer = b.shellBroken ? 1.2 : 1.6;
        }
      }
    }

    this.enemyBullets = this.enemyBullets.filter((b) => {
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      if (b.mirrorBounce && !b.bounced && (b.x <= 12 || b.x >= this.width - 12)) {
        b.vx = -b.vx;
        b.bounced = true;
        b.color = '#54eaff';
        this.spawnHitSparks(b.x, b.y, '#54eaff');
      }

      for (const p of this.players) {
        if (p.alive && p.invuln <= 0 && Math.hypot(p.x - b.x, p.y - b.y) < p.radius * 0.6 + b.radius) {
          this.damagePlayer(p, 20);
          return false;
        }
      }

      return b.y > -50 && b.y < this.height + 50 && b.x > -50 && b.x < this.width + 50;
    });

    this.pickups = this.pickups.filter((pk) => {
      pk.y += pk.vy * dt;
      pk.angle += dt * 3;

      for (const p of this.players) {
        if (!p.alive) continue;
        const d = Math.hypot(p.x - pk.x, p.y - pk.y);
        if (d < 140) {
          pk.x += ((p.x - pk.x) / d) * 360 * dt;
          pk.y += ((p.y - pk.y) / d) * 360 * dt;
        }
        if (d < p.radius + pk.radius) {
          if (pk.type === 'P') {
            p.weaponLevel = Math.min(10, p.weaponLevel + 1);
            this.sound.playSfx('power_pickup', { level: p.weaponLevel });
            this.addFloatText(p.x, p.y - 28, `Lv.${p.weaponLevel} UP!`, '#54eaff', 16, 1.2);
          } else if (pk.type === 'B') {
            p.bombs = Math.min(p.maxBombs, p.bombs + 1);
            this.sound.playSfx('bomb_pickup');
            this.addFloatText(p.x, p.y - 28, '+1 必殺炸彈', '#ffbe55', 16, 1.2);
          } else {
            p.hp = Math.min(p.maxHp, p.hp + 35);
            this.sound.playSfx('power_pickup', { level: 5 });
            this.addFloatText(p.x, p.y - 28, 'HP +35%', '#42f5aa', 16, 1.2);
          }
          this.score += 250;
          this.updateShowcaseToolbar();
          return false;
        }
      }
      return pk.y < this.height + 40;
    });

    this.particles = this.particles.filter((pt) => {
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 0.96;
      pt.vy *= 0.96;
      pt.life -= dt;
      return pt.life > 0;
    });

    this.floatTexts = this.floatTexts.filter((ft) => {
      ft.y -= 30 * dt;
      ft.life -= dt;
      return ft.life > 0;
    });

    this.updateCombatHUD();
  }

  fireEnemyWeapon(e, st) {
    const isMirror = st.hazards?.includes('mirror_bullets');
    const pTarget = this.players.find((p) => p.alive) || { x: this.width / 2, y: this.height * 0.8 };
    const aim = Math.atan2(pTarget.y - e.y, pTarget.x - e.x);
    const spd = e.bulletSpeed;

    if (e.pattern === 'single') {
      this.spawnEnemyBullet(e.x, e.y + 18, Math.cos(aim) * spd, Math.sin(aim) * spd, e.color, isMirror);
    } else if (e.pattern === 'aimed_double') {
      [-0.1, 0.1].forEach((off) => {
        this.spawnEnemyBullet(e.x, e.y + 18, Math.cos(aim + off) * spd, Math.sin(aim + off) * spd, e.color, isMirror);
      });
    } else if (e.pattern === 'fan3' || e.pattern === 'fan5') {
      const cnt = e.pattern === 'fan5' ? 5 : 3;
      for (let i = 0; i < cnt; i++) {
        const a = aim + ((i / (cnt - 1)) - 0.5) * 0.65;
        this.spawnEnemyBullet(e.x, e.y + 18, Math.cos(a) * spd, Math.sin(a) * spd, e.color, isMirror);
      }
    } else if (e.pattern === 'rotating_cross') {
      for (let i = 0; i < 4; i++) {
        const a = e.rotation + (Math.PI / 2) * i;
        this.spawnEnemyBullet(e.x, e.y, Math.cos(a) * spd, Math.sin(a) * spd, e.color, isMirror);
      }
    } else if (e.pattern === 'ring8') {
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI * 2 * i) / 8;
        this.spawnEnemyBullet(e.x, e.y, Math.cos(a) * spd, Math.sin(a) * spd, e.color, isMirror);
      }
    }
  }

  maybeDropPickup(x, y, guaranteed = false) {
    const r = Math.random();
    if (guaranteed || r < 0.34) {
      const type = guaranteed ? (r < 0.65 ? 'P' : 'B') : (r < 0.22 ? 'P' : r < 0.29 ? 'H' : 'B');
      this.pickups.push({ type, x, y, vy: 105, radius: 15, angle: 0 });
    }
  }

  damagePlayer(p, amount) {
    if (this.state === 'showcase') {
      p.invuln = 1.0;
      p.hitFlash = 0.2;
      this.sound.playSfx('player_hit');
      return;
    }

    p.hp = Math.max(0, p.hp - amount);
    p.invuln = 1.65;
    p.hitFlash = 0.25;
    this.combo = 1.0;
    this.triggerShake(10, 0.35);
    this.sound.playSfx('player_hit', { volume: 0.9 });
    this.spawnExplosion(p.x, p.y, '#54eaff', 12, 200);

    if (p.hp <= 0) {
      p.alive = false;
      this.sound.playSfx('player_explosion', { volume: 1.0 });
      this.spawnExplosion(p.x, p.y, '#ff4d6d', 34, 300);

      if (this.players.every((pl) => !pl.alive)) {
        this.state = 'gameover';
        this.showGameOverModal();
      }
    }
  }

  triggerShake(intensity, duration) {
    if (this.reducedMotion) return;
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeTime = Math.max(this.shakeTime, duration);
  }

  spawnHitSparks(x, y, color) {
    const count = this.reducedMotion ? 2 : 4;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 60 + Math.random() * 140;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        size: 2.2 + Math.random() * 2.2,
        color,
        life: 0.16 + Math.random() * 0.12,
        maxLife: 0.28
      });
    }
  }

  spawnExplosion(x, y, color, count = 14, maxSpd = 240) {
    const actual = this.reducedMotion ? Math.ceil(count * 0.4) : count;
    for (let i = 0; i < actual; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 30 + Math.random() * maxSpd;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        size: 3 + Math.random() * 5,
        color,
        life: 0.3 + Math.random() * 0.32,
        maxLife: 0.62
      });
    }
  }

  addFloatText(x, y, text, color = '#ffffff', size = 15, life = 1.0) {
    this.floatTexts.push({ x, y, text, color, size, life, maxLife: life });
  }

  updateCombatHUD() {
    const st = STAGES[this.selectedStageIdx];
    document.getElementById('hud-score').textContent = String(Math.floor(this.score)).padStart(6, '0');
    document.getElementById('hud-combo').textContent = `x${this.combo.toFixed(1)}`;

    const prog = this.boss ? 100 : Math.min(100, (this.stageTime / st.bossTime) * 100);
    document.getElementById('hud-stage-progress').style.width = `${prog}%`;

    const p1 = this.players[0];
    if (p1) {
      const s1 = SHIPS[p1.shipIdx];
      document.getElementById('hud-p1-name').textContent = `${s1.name}`;
      document.getElementById('hud-p1-lv').textContent = p1.inSlowField
        ? `Lv.${p1.weaponLevel} ⚠`
        : `Lv.${p1.weaponLevel}`;
      const hpBar = document.getElementById('hud-p1-hp');
      const pct = Math.max(0, (p1.hp / p1.maxHp) * 100);
      hpBar.style.width = `${pct}%`;
      hpBar.classList.toggle('low', pct <= 35);
      document.getElementById('hud-p1-hp-text').textContent = `HP ${Math.ceil(pct)}%`;
      this.renderBombPips('hud-p1-bombs', p1.bombs, p1.maxBombs);

      const bombBtn = document.getElementById('btn-combat-bomb');
      const bombCnt = document.getElementById('big-bomb-count');
      if (bombBtn && bombCnt) {
        bombCnt.textContent = `x${p1.bombs}`;
        bombBtn.classList.toggle('empty', p1.bombs <= 0);
      }
    }

    const p2Card = document.getElementById('hud-p2-card');
    const p2 = this.players[1];
    if (p2) {
      p2Card.classList.remove('hidden');
      const s2 = SHIPS[p2.shipIdx];
      document.getElementById('hud-p2-name').textContent = `P2 ${s2.name}`;
      document.getElementById('hud-p2-lv').textContent = `Lv.${p2.weaponLevel}`;
      const pct2 = Math.max(0, (p2.hp / p2.maxHp) * 100);
      document.getElementById('hud-p2-hp').style.width = `${pct2}%`;
      document.getElementById('hud-p2-hp-text').textContent = p2.alive ? `HP ${Math.ceil(pct2)}%` : '待命';
      this.renderBombPips('hud-p2-bombs', p2.bombs, p2.maxBombs);
    } else {
      p2Card.classList.add('hidden');
    }
  }

  renderBombPips(containerId, count, max) {
    const el = document.getElementById(containerId);
    if (!el) return;
    let html = '';
    for (let i = 0; i < max; i++) {
      html += `<span class="bomb-pip ${i < count ? 'filled' : ''}"></span>`;
    }
    el.innerHTML = html;
  }

  updateBossHUD() {
    if (!this.boss) return;
    const b = this.boss;
    document.getElementById('boss-shell-bar').style.width = `${Math.max(0, (b.shellHp / b.maxShellHp) * 100)}%`;
    document.getElementById('boss-core-bar').style.width = `${Math.max(0, (b.coreHp / b.maxCoreHp) * 100)}%`;
  }

  render() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.save();
    if (this.shakeTime > 0 && !this.reducedMotion) {
      ctx.translate(
        (Math.random() - 0.5) * this.shakeIntensity,
        (Math.random() - 0.5) * this.shakeIntensity
      );
    }

    this.renderBackground(ctx, w, h);

    if (this.state !== 'hangar') {
      this.renderHazardsAndLanding(ctx, w, h);
      this.renderPickups(ctx);
      this.renderPlayerBullets(ctx);
      this.renderEnemiesAndBoss(ctx);
      this.renderPlayers(ctx);
      this.renderEnemyBullets(ctx);
      this.renderParticlesAndTexts(ctx);

      if (this.bombFlashTimer > 0 && !this.reducedMotion) {
        ctx.fillStyle = this.bombFlashColor;
        ctx.globalAlpha = (this.bombFlashTimer / 0.75) * 0.25;
        ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = 1;
      }
    }

    ctx.restore();
  }

  renderBackground(ctx, w, h) {
    const st = STAGES[this.selectedStageIdx];
    ctx.fillStyle = '#030711';
    ctx.fillRect(0, 0, w, h);

    const bgImg = this.sprites.images.get(st.bgSprite);
    if (bgImg) {
      ctx.save();
      ctx.globalAlpha = 0.6;
      const scale = Math.max(w / bgImg.width, h / bgImg.height) * 1.06;
      const dw = bgImg.width * scale;
      const dh = bgImg.height * scale;
      const ox = (w - dw) / 2;
      const oy = (h - dh) / 2 + Math.sin(this.stageTime * 0.2) * 14;
      ctx.drawImage(bgImg, ox, oy, dw, dh);
      ctx.restore();
    }

    for (const s of this.stars) {
      const sy = (s.y * h + this.stageTime * s.speed) % h;
      const sx = s.x * w;
      ctx.fillStyle = s.hue;
      ctx.globalAlpha = s.alpha;
      ctx.fillRect(sx, sy, s.size, s.size * (s.speed > 75 ? 3.0 : 1.2));
    }
    ctx.globalAlpha = 1;
  }

  renderHazardsAndLanding(ctx, w, h) {
    for (const hz of this.hazards) {
      if (hz.type === 'meteor_lane') {
        ctx.save();
        ctx.fillStyle = 'rgba(255, 210, 90, 0.14)';
        ctx.fillRect(hz.x - hz.width / 2, 0, hz.width, h);
        ctx.strokeStyle = '#ffd25a';
        ctx.setLineDash([10, 8]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(hz.x, 0);
        ctx.lineTo(hz.x, h);
        ctx.stroke();
        ctx.restore();
      } else if (hz.type === 'solar_wind') {
        const active = hz.timer >= hz.warningTime;
        ctx.save();
        ctx.fillStyle = active ? 'rgba(255, 205, 86, 0.22)' : 'rgba(255, 205, 86, 0.09)';
        ctx.fillRect(hz.x, 0, hz.width, h);
        ctx.strokeStyle = '#ffd25a';
        ctx.strokeRect(hz.x, 0, hz.width, h);
        ctx.restore();
      } else if (hz.type === 'thermal_corridor') {
        const active = hz.timer >= hz.warningTime;
        ctx.save();
        ctx.fillStyle = active ? 'rgba(255, 92, 52, 0.24)' : 'rgba(255, 92, 52, 0.1)';
        ctx.fillRect(0, 0, hz.corridorX, h);
        ctx.fillRect(hz.corridorX + hz.corridorW, 0, w - (hz.corridorX + hz.corridorW), h);
        ctx.strokeStyle = '#42f5aa';
        ctx.setLineDash([12, 8]);
        ctx.strokeRect(hz.corridorX, 0, hz.corridorW, h);
        ctx.restore();
      }
    }

    if (this.landingPhase) {
      const lp = this.landingPhase;
      const prog = Math.min(1, lp.timer / lp.duration);
      ctx.save();
      ctx.fillStyle = 'rgba(115, 28, 22, 0.55)';
      ctx.fillRect(0, 0, lp.corridorX, h);
      ctx.fillRect(lp.corridorX + lp.corridorW, 0, w - (lp.corridorX + lp.corridorW), h);

      ctx.strokeStyle = '#ffbe55';
      ctx.lineWidth = 3;
      ctx.setLineDash([16, 12]);
      ctx.beginPath();
      ctx.moveTo(lp.corridorX, 0);
      ctx.lineTo(lp.corridorX, h);
      ctx.moveTo(lp.corridorX + lp.corridorW, 0);
      ctx.lineTo(lp.corridorX + lp.corridorW, h);
      ctx.stroke();

      const padY = -100 + prog * (h * 0.65 + 100);
      const padX = lp.corridorX + lp.corridorW / 2;
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(16, 42, 62, 0.9)';
      ctx.strokeStyle = '#54eaff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(padX, padY, 56, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffdf9e';
      ctx.font = '800 13px "Orbitron", "Noto Sans TC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('曙光前哨站', padX, padY - 68);
      ctx.fillText('H', padX, padY + 5);
      ctx.restore();
    }
  }

  renderPickups(ctx) {
    for (const pk of this.pickups) {
      ctx.save();
      ctx.translate(pk.x, pk.y);
      const col = pk.type === 'P' ? '#54eaff' : pk.type === 'B' ? '#ffbe55' : '#42f5aa';
      ctx.shadowColor = col;
      ctx.shadowBlur = 12;
      ctx.fillStyle = 'rgba(8, 22, 38, 0.92)';
      ctx.strokeStyle = col;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, pk.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 13px "Orbitron", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pk.type, 0, 1);
      ctx.restore();
    }
  }

  renderPlayerBullets(ctx) {
    for (const b of this.bullets) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(Math.atan2(b.vy, b.vx) + Math.PI / 2);
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 10;

      if (b.style === 'lance') {
        ctx.fillStyle = b.color;
        ctx.fillRect(-b.radius * 0.45, -15, b.radius * 0.9, 30);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-b.radius * 0.22, -13, b.radius * 0.44, 24);
      } else if (b.style === 'prism' || b.style === 'facet') {
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.moveTo(0, -13);
        ctx.lineTo(b.radius * 1.1, 0);
        ctx.lineTo(0, 11);
        ctx.lineTo(-b.radius * 1.1, 0);
        ctx.closePath();
        ctx.fill();
      } else if (b.style === 'cannon') {
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.roundRect(-b.radius * 0.75, -16, b.radius * 1.5, 32, 5);
        ctx.fill();
      } else {
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  renderEnemiesAndBoss(ctx) {
    for (const e of this.enemies) {
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.save();
      if (e.rotates) ctx.rotate(e.rotation);
      const sp = this.sprites.images.get(e.sprite);
      const size = e.radius * 2.3;
      if (sp) {
        if (e.hitFlash > 0) ctx.filter = 'brightness(2.4)';
        if (!e.rotates) ctx.rotate(Math.PI);
        const scale = Math.min(size / sp.width, size / sp.height);
        ctx.drawImage(sp, (-sp.width * scale) / 2, (-sp.height * scale) / 2, sp.width * scale, sp.height * scale);
      } else {
        ctx.fillStyle = e.hitFlash > 0 ? '#ffffff' : e.color;
        ctx.beginPath();
        ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // 當敵機受損或為中大型裝甲單位時，在機體上方繪製戰術血條
      if (e.kind !== 'debris' && (e.hp < e.maxHp || e.maxHp >= 260) && e.y > 28) {
        const bw = Math.max(30, e.radius * 1.6);
        const bh = 4;
        const bx = -bw / 2;
        const by = -e.radius - 12;
        const ratio = Math.max(0, Math.min(1, e.hp / e.maxHp));
        ctx.fillStyle = 'rgba(4, 12, 24, 0.82)';
        ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
        ctx.fillStyle = ratio > 0.45 ? e.color : '#ff4d6d';
        ctx.fillRect(bx, by, bw * ratio, bh);
      }
      ctx.restore();
    }

    if (this.boss && this.boss.active) {
      const b = this.boss;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.strokeStyle = b.shellHp > 0 ? 'rgba(255, 195, 95, 0.5)' : 'rgba(255, 55, 95, 0.65)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, b.radius * 1.08 + Math.sin(this.stageTime * 6) * 4, 0, Math.PI * 2);
      ctx.stroke();

      const bSp = this.sprites.images.get(b.sprite);
      const maxDim = b.radius * 2.4;
      if (bSp) {
        if (b.hitFlash > 0) ctx.filter = 'brightness(2.3)';
        const scale = Math.min(maxDim / bSp.width, maxDim / bSp.height);
        ctx.drawImage(bSp, (-bSp.width * scale) / 2, (-bSp.height * scale) / 2, bSp.width * scale, bSp.height * scale);
      }
      ctx.restore();
    }
  }

  renderPlayers(ctx) {
    this.players.forEach((p) => {
      if (!p.alive) return;
      const ship = SHIPS[p.shipIdx];
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.bankAngle);

      if (p.invuln > 0) {
        ctx.strokeStyle = ship.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.45 + Math.sin(this.stageTime * 18) * 0.25;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius * 1.6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      const flameLen = 20 + Math.sin(this.stageTime * 45) * 6;
      [-10, 10].forEach((ox) => {
        const fg = ctx.createLinearGradient(ox, 20, ox, 20 + flameLen);
        fg.addColorStop(0, '#ffffff');
        fg.addColorStop(0.4, ship.color);
        fg.addColorStop(1, 'transparent');
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.moveTo(ox - 4.5, 18);
        ctx.lineTo(ox + 4.5, 18);
        ctx.lineTo(ox, 22 + flameLen);
        ctx.closePath();
        ctx.fill();
      });

      const sp = this.sprites.shipSprites[p.shipIdx];
      if (sp) {
        if (p.hitFlash > 0) ctx.filter = 'brightness(2.5)';
        const targetH = 70;
        const scale = targetH / sp.height;
        ctx.shadowColor = ship.color;
        ctx.shadowBlur = 12;
        ctx.drawImage(sp, (-sp.width * scale) / 2, (-sp.height * scale) / 2, sp.width * scale, sp.height * scale);
      }

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 2, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (this.escortEnabled) {
        const orbitAngle = this.stageTime * 3.2;
        [-1, 1].forEach((side) => {
          const ex = p.x + side * 44 + Math.cos(orbitAngle + side) * 5;
          const ey = p.y + 6 + Math.sin(orbitAngle + side) * 5;
          ctx.save();
          ctx.translate(ex, ey);
          ctx.fillStyle = ship.color;
          ctx.beginPath();
          ctx.moveTo(0, -9);
          ctx.lineTo(7, 7);
          ctx.lineTo(0, 3);
          ctx.lineTo(-7, 7);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        });
      }
    });
  }

  renderEnemyBullets(ctx) {
    for (const b of this.enemyBullets) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 8;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, b.radius * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  renderParticlesAndTexts(ctx) {
    for (const pt of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const ft of this.floatTexts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.life / ft.maxLife);
      ctx.font = `900 ${ft.size}px "Orbitron", "Noto Sans TC", sans-serif`;
      ctx.fillStyle = ft.color;
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }

  togglePause() {
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    if (this.state === 'playing') {
      this.state = 'paused';
      content.innerHTML = `
        <div class="modal-header">
          <h2>⏸ 暫停與設定</h2>
          <button type="button" class="icon-btn" id="modal-resume-top">繼續</button>
        </div>
        <div style="display:grid;gap:12px;margin-bottom:16px;">
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.86rem;">
            <span>配樂音量 (BGM)</span>
            <input type="range" id="pause-bgm" min="0" max="100" value="${Math.round(this.sound.bgmVolume * 100)}" style="width:140px;accent-color:var(--cyan);" />
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.86rem;">
            <span>音效音量 (SFX)</span>
            <input type="range" id="pause-sfx" min="0" max="100" value="${Math.round(this.sound.sfxVolume * 100)}" style="width:140px;accent-color:var(--cyan);" />
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.86rem;">
            <span>雙架無敵追蹤僚機</span>
            <button type="button" class="icon-btn" id="pause-escort">${this.escortEnabled ? '已開啟' : '已關閉'}</button>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.86rem;">
            <span>減少畫面震動與閃光</span>
            <button type="button" class="icon-btn" id="pause-motion">${this.reducedMotion ? '已開啟' : '標準'}</button>
          </div>
        </div>
        <div style="display:grid;gap:8px;">
          <button type="button" class="hero-start-btn" id="modal-resume-btn" style="padding:12px;">繼續戰鬥</button>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <button type="button" class="secondary-btn" id="modal-retry-btn">重試本關</button>
            <button type="button" class="secondary-btn" id="modal-hangar-btn">返回首頁機庫</button>
          </div>
        </div>
      `;
      overlay.classList.remove('hidden');

      document.getElementById('pause-bgm').addEventListener('input', (e) => this.sound.setBgmVolume(Number(e.target.value) / 100));
      document.getElementById('pause-sfx').addEventListener('input', (e) => this.sound.setSfxVolume(Number(e.target.value) / 100));
      document.getElementById('pause-escort').addEventListener('click', (e) => {
        this.escortEnabled = !this.escortEnabled;
        e.target.textContent = this.escortEnabled ? '已開啟' : '已關閉';
      });
      document.getElementById('pause-motion').addEventListener('click', (e) => {
        this.reducedMotion = !this.reducedMotion;
        e.target.textContent = this.reducedMotion ? '已開啟' : '標準';
      });
      document.getElementById('modal-resume-top').addEventListener('click', () => this.togglePause());
      document.getElementById('modal-resume-btn').addEventListener('click', () => this.togglePause());
      document.getElementById('modal-retry-btn').addEventListener('click', () => this.startStage(this.selectedStageIdx));
      document.getElementById('modal-hangar-btn').addEventListener('click', () => this.openHangar());
    } else if (this.state === 'paused') {
      this.state = 'playing';
      overlay.classList.add('hidden');
    }
  }

  showStageClearModal(st, isFinalVictory) {
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    content.innerHTML = `
      <div class="modal-header">
        <h2 style="color:#42f5aa;">✔ ${st.clearTitle}</h2>
      </div>
      <p style="font-size:1rem;font-weight:700;color:#fff;margin-bottom:6px;">${st.clearMessage}</p>
      <p style="color:var(--text-muted);font-size:0.84rem;margin-bottom:14px;">${st.clearDetail}</p>
      <div style="background:rgba(84,234,255,0.08);border:1px solid rgba(84,234,255,0.28);padding:12px;border-radius:12px;margin-bottom:16px;font-family:var(--font-mono);text-align:center;">
        戰術總積分：<strong style="color:var(--cyan);font-size:1.3rem;">${Math.floor(this.score)}</strong>
      </div>
      <div style="display:grid;gap:8px;">
        ${
          !isFinalVictory
            ? `<button type="button" class="hero-start-btn" id="modal-next-stage">前往第 ${String(st.id + 1).padStart(2, '0')} 關 →</button>`
            : `<button type="button" class="hero-start-btn" id="modal-replay-all">再次從頭挑戰</button>`
        }
        <button type="button" class="secondary-btn" id="modal-back-hangar">返回機庫首頁</button>
      </div>
    `;
    overlay.classList.remove('hidden');

    const nextBtn = document.getElementById('modal-next-stage');
    if (nextBtn) nextBtn.addEventListener('click', () => this.startStage(this.selectedStageIdx + 1, true));
    const replayBtn = document.getElementById('modal-replay-all');
    if (replayBtn) replayBtn.addEventListener('click', () => this.startStage(0, false));
    document.getElementById('modal-back-hangar').addEventListener('click', () => this.openHangar());
  }

  showGameOverModal() {
    const st = STAGES[this.selectedStageIdx];
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    content.innerHTML = `
      <div class="modal-header">
        <h2 style="color:#ff4d6d;">✖ 任務中止</h2>
      </div>
      <p style="color:#ffd8e0;font-size:0.9rem;margin-bottom:12px;">
        於 <strong>${st.zoneTitle}</strong> 遭受重創，逃生艙已回收。
      </p>
      <div style="background:rgba(255,77,109,0.08);border:1px solid rgba(255,77,109,0.3);padding:12px;border-radius:12px;margin-bottom:16px;font-family:var(--font-mono);text-align:center;">
        本次得分：<strong style="color:#fff;font-size:1.3rem;">${Math.floor(this.score)}</strong>
      </div>
      <div style="display:grid;gap:8px;">
        <button type="button" class="hero-start-btn" id="modal-retry-now">立即重試本關</button>
        <button type="button" class="secondary-btn" id="modal-go-hangar">返回機庫換機體</button>
      </div>
    `;
    overlay.classList.remove('hidden');
    document.getElementById('modal-retry-now').addEventListener('click', () => this.startStage(this.selectedStageIdx, false));
    document.getElementById('modal-go-hangar').addEventListener('click', () => this.openHangar());
  }

  showGuideModal() {
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    content.innerHTML = `
      <div class="modal-header">
        <h2>❓ 快速玩法說明</h2>
        <button type="button" class="icon-btn" id="modal-close-guide">關閉</button>
      </div>
      <div style="display:grid;gap:10px;font-size:0.84rem;line-height:1.55;color:#d6e8f5;">
        <div style="background:rgba(14,32,58,0.65);padding:11px;border-radius:12px;border:1px solid rgba(84,234,255,0.22);">
          <strong style="color:var(--cyan);display:block;margin-bottom:3px;">📱 手機／觸控單手直覺操作</strong>
          <div>• <strong>移動＋射擊：</strong>單指按住螢幕<strong>任意位置滑動</strong>即可操控飛機（已預設開啟自動連射，手指不會擋住飛機）。</div>
          <div>• <strong>必殺炸彈：</strong>點按右下角 <strong>💥 必殺按鈕</strong>，或在螢幕任意處<strong>快速連點兩下</strong>即可全屏清彈！</div>
        </div>
        <div style="background:rgba(14,32,58,0.65);padding:11px;border-radius:12px;border:1px solid rgba(201,155,255,0.25);">
          <strong style="color:var(--violet);display:block;margin-bottom:3px;">⌨️ 電腦鍵盤／滑鼠操作</strong>
          <div>• <strong>P1：</strong>滑鼠按住拖曳 或 <kbd>WASD</kbd>／<kbd>方向鍵</kbd> 移動，<kbd>B</kbd>／<kbd>I</kbd>／<kbd>Shift</kbd> 放炸彈。</div>
          <div>• <strong>P2（雙人模式）：</strong><kbd>方向鍵</kbd> 移動，<kbd>K</kbd> 或 <kbd>.</kbd> 放炸彈。</div>
        </div>
        <div style="background:rgba(14,32,58,0.65);padding:11px;border-radius:12px;border:1px solid rgba(255,173,98,0.25);">
          <strong style="color:var(--amber);display:block;margin-bottom:3px;">⚡ 道具與 Boss 破甲機制</strong>
          <div>• 吃 <strong>[P]</strong> 升武器等級（最高 Lv.10）、<strong>[B]</strong> 補炸彈、<strong>[H]</strong> 回血。</div>
          <div>• Boss 具備「外殼＋核心」雙層血條，擊碎外殼即可暴露核心！</div>
        </div>
      </div>
    `;
    overlay.classList.remove('hidden');
    document.getElementById('modal-close-guide').addEventListener('click', () => overlay.classList.add('hidden'));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.game9527 = new Game9527();
});
