// ============================================================================
// 《9527：星際遠征》 雙重混音音效引擎 (Hybrid WAV + Web Audio Synthesizer)
// 結合原版解包之 20 組高音質 WAV 與 Web Audio 動態合成、立體聲定位、防爆音節流
// ============================================================================

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.bgmGain = null;
    this.sfxGain = null;
    this.unlocked = false;
    this.muted = false;
    this.bgmVolume = 0.55;
    this.sfxVolume = 0.75;

    this.buffers = new Map();
    this.loadingPromises = new Map();
    this.currentBgmName = null;
    this.currentBgmSource = null;
    this.lastPlayTime = new Map();

    this.sfxMap = {
      shot_a: 'assets/audio/sfx-shot-a.wav',
      shot_b: 'assets/audio/sfx-shot-b.wav',
      shot_c: 'assets/audio/sfx-shot-c.wav',
      bomb_a: 'assets/audio/sfx-bomb-a.wav',
      bomb_b: 'assets/audio/sfx-bomb-b.wav',
      bomb_c: 'assets/audio/sfx-bomb-c.wav',
      bomb_pickup: 'assets/audio/sfx-bomb-pickup.wav',
      power_pickup: 'assets/audio/sfx-power-pickup.wav',
      enemy_hit: 'assets/audio/sfx-enemy-hit.wav',
      enemy_destroy: 'assets/audio/sfx-enemy-destroy.wav',
      boss_warning: 'assets/audio/sfx-boss-warning.wav',
      boss_hit: 'assets/audio/sfx-boss-hit.wav',
      boss_destroy: 'assets/audio/sfx-boss-destroy.wav',
      player_hit: 'assets/audio/sfx-player-hit.wav',
      player_explosion: 'assets/audio/sfx-player-explosion.wav',
      launch: 'assets/audio/sfx-launch.wav'
    };
  }

  initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.bgmGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();

      // 加入輕微動態壓縮器防止多重音效爆音
      const compressor = this.ctx.createDynamicsCompressor();
      compressor.threshold.value = -14;
      compressor.knee.value = 18;
      compressor.ratio.value = 6;
      compressor.attack.value = 0.004;
      compressor.release.value = 0.16;

      this.bgmGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(compressor);
      compressor.connect(this.ctx.destination);

      this.applyVolumes();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    this.unlocked = Boolean(this.ctx && this.ctx.state === 'running');
    return this.ctx;
  }

  async unlock() {
    this.initContext();
    if (this.ctx && this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch (_) {}
    }
    this.unlocked = Boolean(this.ctx && this.ctx.state === 'running');
    this.preloadCoreSfx();
    if (this.currentBgmName && !this.currentBgmSource) {
      this.playBgm(this.currentBgmName);
    }
    return this.unlocked;
  }

  applyVolumes() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 1, now, 0.02);
    this.bgmGain.gain.setTargetAtTime(this.bgmVolume, now, 0.03);
    this.sfxGain.gain.setTargetAtTime(this.sfxVolume, now, 0.02);
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    this.applyVolumes();
  }

  suspendAudio() {
    if (this.ctx && this.ctx.state === 'running') {
      try {
        this.ctx.suspend();
      } catch (_) {}
    }
  }

  resumeAudio() {
    if (this.ctx && this.ctx.state === 'suspended' && !this.muted) {
      try {
        this.ctx.resume();
      } catch (_) {}
    }
  }

  setBgmVolume(v) {
    this.bgmVolume = Math.max(0, Math.min(1, v));
    this.applyVolumes();
  }

  setSfxVolume(v) {
    this.sfxVolume = Math.max(0, Math.min(1, v));
    this.applyVolumes();
  }

  async loadBuffer(url) {
    if (this.buffers.has(url)) return this.buffers.get(url);
    if (this.loadingPromises.has(url)) return this.loadingPromises.get(url);
    this.initContext();
    if (!this.ctx) return null;

    const p = fetch(url)
      .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject(new Error('HTTP ' + res.status))))
      .then((ab) => this.ctx.decodeAudioData(ab))
      .then((audioBuf) => {
        this.buffers.set(url, audioBuf);
        return audioBuf;
      })
      .catch(() => null);

    this.loadingPromises.set(url, p);
    return p;
  }

  preloadCoreSfx() {
    Object.values(this.sfxMap).forEach((url) => this.loadBuffer(url));
  }

  async playBgm(bgmFile) {
    const url = bgmFile.startsWith('assets/') ? bgmFile : `assets/audio/${bgmFile}`;
    if (this.currentBgmName === url && this.currentBgmSource) return;
    this.currentBgmName = url;

    this.initContext();
    if (!this.ctx) return;

    const buf = await this.loadBuffer(url);
    if (!buf || this.currentBgmName !== url) return;

    this.stopBgm(false);
    try {
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const fadeGain = this.ctx.createGain();
      fadeGain.gain.setValueAtTime(0.01, this.ctx.currentTime);
      fadeGain.gain.exponentialRampToValueAtTime(1.0, this.ctx.currentTime + 0.6);
      src.connect(fadeGain);
      fadeGain.connect(this.bgmGain);
      src.start(0);
      this.currentBgmSource = src;
    } catch (_) {}
  }

  stopBgm(clearName = true) {
    if (this.currentBgmSource) {
      try {
        this.currentBgmSource.stop();
        this.currentBgmSource.disconnect();
      } catch (_) {}
      this.currentBgmSource = null;
    }
    if (clearName) this.currentBgmName = null;
  }

  // 播放音效並疊加立體聲與動態合成強化層
  playSfx(key, options = {}) {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = performance.now();
    const minGap = options.minGap ?? (key.startsWith('shot') ? 48 : key.includes('hit') ? 38 : 25);
    const last = this.lastPlayTime.get(key) || 0;
    if (now - last < minGap) return;
    this.lastPlayTime.set(key, now);

    const panVal = Math.max(-0.85, Math.min(0.85, options.pan ?? 0));
    const rate = options.rate ?? (0.96 + Math.random() * 0.08);
    const vol = options.volume ?? 1.0;

    const url = this.sfxMap[key];
    if (url && this.buffers.has(url)) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.buffers.get(url);
      src.playbackRate.value = rate;

      const g = this.ctx.createGain();
      g.gain.value = vol;

      if (this.ctx.createStereoPanner) {
        const panner = this.ctx.createStereoPanner();
        panner.pan.value = panVal;
        src.connect(g);
        g.connect(panner);
        panner.connect(this.sfxGain);
      } else {
        src.connect(g);
        g.connect(this.sfxGain);
      }
      src.start(0);
    } else if (url) {
      this.loadBuffer(url);
    }

    // 疊加精緻化科幻合成谐波層，賦予更高辨識度與重低音打擊感
    this.playSynthLayer(key, panVal, vol, options);
  }

  playSynthLayer(key, panVal, vol, options = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const out = this.ctx.createGain();
    out.gain.value = vol * 0.36;

    if (this.ctx.createStereoPanner) {
      const panner = this.ctx.createStereoPanner();
      panner.pan.value = panVal;
      out.connect(panner);
      panner.connect(this.sfxGain);
    } else {
      out.connect(this.sfxGain);
    }

    if (key === 'shot_a') {
      // 游隼：清脆高頻青色雷射啾聲
      this.tone(out, 'triangle', 1350, 440, 0.065, 0.25);
    } else if (key === 'shot_b') {
      // 稜鏡：紫晶雙音和弦脈衝
      this.tone(out, 'sine', 980, 520, 0.08, 0.22);
      this.tone(out, 'triangle', 1470, 780, 0.07, 0.16);
    } else if (key === 'shot_c') {
      // 重錨：低沉磁軌重砲衝擊
      this.tone(out, 'sawtooth', 290, 68, 0.11, 0.34);
    } else if (key === 'enemy_hit' || key === 'boss_hit') {
      this.tone(out, 'square', key === 'boss_hit' ? 320 : 520, 140, 0.045, 0.22);
    } else if (key === 'enemy_destroy') {
      this.tone(out, 'sawtooth', 190, 38, 0.22, 0.48);
    } else if (key === 'boss_destroy') {
      // Boss 擊破重型連環低音轟鳴
      this.tone(out, 'sawtooth', 140, 26, 0.75, 0.7);
      this.tone(out, 'triangle', 420, 55, 0.55, 0.5);
    } else if (key === 'power_pickup') {
      const lvl = options.level || 1;
      const base = 440 + lvl * 42;
      this.tone(out, 'sine', base, base * 1.5, 0.14, 0.45);
      this.tone(out, 'triangle', base * 1.25, base * 2.0, 0.22, 0.38);
    } else if (key === 'bomb_pickup') {
      this.tone(out, 'sine', 520, 1040, 0.25, 0.5);
    } else if (key === 'shell_break') {
      // Boss 外殼擊碎專屬玻璃電漿爆裂音
      this.tone(out, 'sawtooth', 880, 110, 0.45, 0.65);
      this.tone(out, 'sine', 1640, 420, 0.38, 0.5);
    } else if (key === 'ui_click') {
      this.tone(out, 'sine', 820, 1240, 0.055, 0.3);
    } else if (key === 'beacon') {
      this.tone(out, 'sine', 880, 880, 0.12, 0.26);
    }
  }

  tone(dest, type, fStart, fEnd, dur, gainVal) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(fStart, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, fEnd), t + dur);
    g.gain.setValueAtTime(gainVal, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g);
    g.connect(dest);
    osc.start(t);
    osc.stop(t + dur + 0.01);
  }
}
