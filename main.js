/**
 * Ploy & Wai — Wedding Snow Globe (2D)
 * SVG globe + rose-petal "snow" + wind-up key + Web Audio music box
 */
(() => {
'use strict';

/* ===================== SETTINGS ===================== */
const LIM_NAME = 10, LIM_MSG = 100;
const VIDEO_MAX = 15, MAX_VIDEO_MB = 150;
const MUSIC_FILE = '';     // e.g. 'music.mp3' (put the file next to index.html); '' = built-in music-box synth
const RUN_SECONDS = 22;    // one full wind lasts this long
const WIND_TURNS = 1;      // taps on the key needed to start (the 3D version used 3)
const PETALS = 120;        // rose petals inside the globe
const DEVICE_SHAKE = true; // shake the phone to shake the globe (iOS asks permission on first tap)

const $ = (id) => document.getElementById(id);
const NS = 'http://www.w3.org/2000/svg';
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const easeSine = (x) => -(Math.cos(Math.PI * x) - 1) / 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const chars = (s) => Array.from(s);

/* globe geometry, in SVG units */
const CX = 200, CY = 195, R_IN = 154, TT_Y = 298;
const groundY = (x) => { const u = (x - CX) / 161; return 316 - 16 * (1 - u * u); };

/* ===================== MUSIC (original waltz, G major) ===================== */
const NOTE = { F4s: 369.99, A4: 440, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, F5s: 739.99, G5: 783.99, A5: 880, B5: 987.77 };
const CHORD = {
  G: [196.0, 293.66, 246.94], Em: [164.81, 246.94, 196.0], C: [130.81, 196.0, 164.81],
  D: [146.83, 220.0, 185.0], Bm: [123.47, 185.0, 146.83]
};
const SCORE = [
  ['B4 - D5 - G5 -', 'G'], ['E5 - - D5 B4 -', 'Em'], ['C5 - E5 - G5 -', 'C'], ['F5s - - A4 D5 -', 'D'],
  ['G5 - - D5 - B4', 'G'], ['D5 - F5s - B4 -', 'Bm'], ['C5 - - E5 D5 C5', 'C'], ['A4 - B4 - A4 -', 'D'],
  ['D5 - G5 - B5 -', 'G'], ['A5 - G5 - E5 -', 'Em'], ['G5 - - E5 C5 -', 'C'], ['A5 - F5s - D5 -', 'D'],
  ['B5 - - A5 G5 -', 'G'], ['F5s - D5 - B4 -', 'Bm'], ['E5 - D5 - C5 -', 'C'], ['F5s - E5 - D5 -', 'D']
];
const SLOTS = [];
SCORE.forEach(([mel, ch]) => mel.split(' ').forEach((t, k) => {
  SLOTS.push({
    m: (t === '-' || t === '.') ? 0 : NOTE[t],
    b: k === 0 ? CHORD[ch][0] : k === 2 ? CHORD[ch][1] : k === 4 ? CHORD[ch][2] : 0, bv: k === 0 ? 0.2 : 0.12
  });
}));
const SLOT_SEC = 0.33;

/* ===================== COUPLE ARTWORK (front + back) ===================== */
const SKIN = '#f5d6c0', ARM = '#efc9ae', HAIR_B = '#3a261d', HAIR_G = '#1f1714';
const RIM = 'stroke="#f1d28a" stroke-opacity=".28" stroke-width="1"';
const face = (blush) => `<circle cx="-4" cy="-115" r="1.3" fill="#3a2a22"/><circle cx="4" cy="-115" r="1.3" fill="#3a2a22"/>
  ${blush ? '<circle cx="-7" cy="-111" r="2.2" fill="#f2899c" opacity=".6"/><circle cx="7" cy="-111" r="2.2" fill="#f2899c" opacity=".6"/>' : ''}
  <path d="M-2 -110.5 Q0 -109 2 -110.5" stroke="#a7604f" fill="none" stroke-width="1" stroke-linecap="round"/>`;
const DRESS = `<path d="M-9 -80 C-13 -55 -30 -24 -36 -2 Q0 4 36 -2 C30 -24 13 -55 9 -80Z" fill="#fff6ea" stroke="#e0cdb4" stroke-width="1.1"/>
  <path d="M-4 -68 Q-11 -35 -15 -2 M4 -68 Q11 -35 15 -2" stroke="#eadbc6" fill="none" stroke-width="1.1"/>
  <path d="M-11 -101 Q0 -97 11 -101 L9 -80 L-9 -80Z" fill="#fff6ea" stroke="#e0cdb4" stroke-width="1.1"/>
  <rect x="-9.5" y="-82" width="19" height="3" rx="1.5" fill="#d7b06a"/>`;
const BRIDE_FRONT = `
  <path d="M-7 -126 C-27 -110 -31 -70 -26 -36 L26 -36 C31 -70 27 -110 7 -126Z" fill="#fff" opacity=".42"/>
  ${DRESS}
  <path d="M-11 -99 Q-16 -88 -5 -80 M11 -99 Q16 -88 5 -80" stroke="${ARM}" stroke-width="3.6" fill="none" stroke-linecap="round"/>
  <path d="M-2 -73 L0 -62 L2 -73Z" fill="#5d7d57"/>
  <circle cx="-3.5" cy="-79" r="4.5" fill="#b51c3a"/><circle cx="3.5" cy="-80" r="4" fill="#e0405e"/><circle cx="0" cy="-75" r="4" fill="#8e0f27"/>
  <rect x="-3" y="-108" width="6" height="8" fill="${SKIN}"/>
  <circle cy="-116" r="11" fill="${SKIN}"/>
  <path d="M-11.6 -115 C-12 -132 12 -132 11.6 -115 C9 -123 3 -125 0 -121 C-4 -125 -9 -123 -11.6 -115Z" fill="${HAIR_B}"/>
  <circle cy="-130" r="5.5" fill="${HAIR_B}"/>
  <path d="M-6 -126 L-3 -130 L0 -127 L3 -130 L6 -126" stroke="#f1d28a" stroke-width="1.6" fill="none" stroke-linejoin="round"/>
  ${face(true)}`;
const BRIDE_BACK = `
  ${DRESS}
  <path d="M-11 -99 Q-15 -90 -11 -84 M11 -99 Q15 -90 11 -84" stroke="${ARM}" stroke-width="3.6" fill="none" stroke-linecap="round"/>
  <rect x="-3" y="-108" width="6" height="8" fill="${SKIN}"/>
  <circle cy="-116" r="11.6" fill="${HAIR_B}"/>
  <circle cy="-129" r="6" fill="${HAIR_B}"/>
  <path d="M0 -126 C-22 -112 -30 -60 -28 -14 L28 -14 C30 -60 22 -112 0 -126Z" fill="#fff" opacity=".5"/>`;
const suit = (front) => `
  <path d="M-11 -44 L-10 -3 L-2 -3 L-1 -44Z M1 -44 L2 -3 L10 -3 L11 -44Z" fill="#1c1e2a" ${RIM}/>
  <rect x="-12" y="-5" width="10" height="5" rx="2.5" fill="#0d0e14"/><rect x="2" y="-5" width="10" height="5" rx="2.5" fill="#0d0e14"/>
  <path d="M-15 -101 Q-17 -70 -14 -40 L14 -40 Q17 -70 15 -101 Q0 -105 -15 -101Z" fill="#23263a" ${RIM}/>
  ${front ? `<path d="M-5.5 -102 L5.5 -102 L0 -78Z" fill="#fff6ea"/>
  <path d="M-5.5 -102 L0 -78 L-8 -91Z M5.5 -102 L0 -78 L8 -91Z" fill="#161826"/>
  <path d="M-4.5 -100 L0 -98 L4.5 -100 L4.5 -95 L0 -97 L-4.5 -95Z" fill="#1b1405"/>
  <circle cx="-9.5" cy="-91" r="2.8" fill="#c2223d"/><circle cx="0" cy="-66" r="1.2" fill="#d7b06a"/><circle cx="0" cy="-56" r="1.2" fill="#d7b06a"/>`
  : `<path d="M0 -100 V-40" stroke="#161826" stroke-width="1.2"/>`}
  <path d="M-15 -98 Q-19 -74 -16 -58 M15 -98 Q19 -74 16 -58" stroke="#1f2233" stroke-width="6" fill="none" stroke-linecap="round"/>
  <circle cx="-16" cy="-55" r="3" fill="${ARM}"/><circle cx="16" cy="-55" r="3" fill="${ARM}"/>
  <rect x="-3" y="-108" width="6" height="7" fill="${SKIN}"/>`;
const GROOM_FRONT = `${suit(true)}<circle cy="-116" r="11" fill="${SKIN}"/>
  <path d="M-11.6 -114 C-13 -133 13 -133 11.6 -114 C9 -123 -1 -126 -11.6 -114Z" fill="${HAIR_G}"/>${face(false)}`;
const GROOM_BACK = `${suit(false)}<circle cy="-116" r="11.6" fill="${HAIR_G}" ${RIM}/>`;

class App {
  constructor() {
    this.playing = false; this.everOn = false;
    this.reveal = 0; this.level = 0;
    this.volume = 0.5; this.muted = false;
    this.energy = 0; this.speed = 1; this.windCount = 0; this.windT = 1; this.keyAngle = 0;
    this.theta = 0; this.omega = 0; this.landT = 0; this.landK = 0; this.dragging = false; this.wobble = 0;
    this.slotT = 0; this.slot = 0; this.reliftT = 0;
    this.idleSince = performance.now(); this.idleDelay = 3000; this.hintOn = false;
    this.last = performance.now();

    this.buildGround();
    this.buildCouple();
    this.buildPetals();
    this.bindGlobe();
    this.bindUI();
    this.layoutTitle();
    this.initFx();
    addEventListener('resize', () => this.resize());
    this.resize();
    setTimeout(() => this.shake(0.45, false), 700);   // a soft swirl on load: "this globe can be shaken"
    requestAnimationFrame((t) => this.loop(t));
  }

  /* ===================== AUDIO ===================== */
  // iPhone's silent switch mutes Web Audio unless the page is in "playback" mode
  unmuteIOS() {
    try { if (navigator.audioSession) { navigator.audioSession.type = 'playback'; return; } } catch (e) {}
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (!iOS) return;
    if (!this.keepAlive) {   // older iOS: a silent looping <audio> puts the page into playback mode
      const rate = 8000, n = rate / 2, b = new ArrayBuffer(44 + n * 2), v = new DataView(b);
      const w = (o, str) => { for (let i = 0; i < str.length; i++) v.setUint8(o + i, str.charCodeAt(i)); };
      w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
      v.setUint16(22, 1, true); v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true);
      v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
      const a = this.keepAlive = document.createElement('audio');
      a.src = URL.createObjectURL(new Blob([b], { type: 'audio/wav' })); a.loop = true; a.setAttribute('playsinline', ''); a.volume = 0.01;
    }
    clearTimeout(this.keepAliveT);
    this.keepAlive.play().catch(() => {});
  }

  // let the silent loop go when nothing is playing (so iOS doesn't show it as "now playing")
  releaseIOS(delay = 2500) {
    if (!this.keepAlive) return;
    clearTimeout(this.keepAliveT);
    this.keepAliveT = setTimeout(() => { if (!this.playing) this.keepAlive.pause(); }, delay);
  }

  initAudio() {
    this.unmuteIOS();
    if (this.ac) { if (this.ac.state === 'suspended') this.ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ac = new AC();
    this.master = this.ac.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    this.master.connect(this.ac.destination);
    if (MUSIC_FILE) {
      this.audioEl = new Audio(MUSIC_FILE); this.audioEl.loop = true; this.audioEl.preservesPitch = false;
      this.fileGain = this.ac.createGain(); this.fileGain.gain.value = 0;
      this.ac.createMediaElementSource(this.audioEl).connect(this.fileGain);
      this.fileGain.connect(this.master);
    }
    const len = Math.floor(this.ac.sampleRate * 2.2);
    const buf = this.ac.createBuffer(2, len, this.ac.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    const verb = this.ac.createConvolver(); verb.buffer = buf;
    const wet = this.ac.createGain(); wet.gain.value = 0.32;
    verb.connect(wet); wet.connect(this.master);
    this.musicBus = this.ac.createGain();
    this.musicBus.connect(this.master); this.musicBus.connect(verb);
    this.sfxBus = this.ac.createGain();
    this.sfxBus.connect(this.master); this.sfxBus.connect(verb);
  }

  applyVolume() {
    if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ac.currentTime, 0.03);
  }

  tone(dest, f, peak, dec, when = 0, type = 'sine') {
    const ac = this.ac, t = ac.currentTime + when, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dec + 0.1);
  }

  chime(freq, peak = 0.32, soft = false) {
    this.tone(this.musicBus, freq, peak, soft ? 1.5 : 1.8);
    if (!soft) { this.tone(this.musicBus, freq * 3.01, 0.1, 0.7); this.tone(this.musicBus, freq * 5.4, 0.03, 0.25); }
  }

  playTick() {
    if (!this.ac) return;
    const ac = this.ac, now = ac.currentTime, n = Math.floor(ac.sampleRate * 0.03);
    const nb = ac.createBuffer(1, n, ac.sampleRate), d = nb.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource(); src.buffer = nb;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3000; bp.Q.value = 2;
    const g = ac.createGain(); g.gain.setValueAtTime(0.35, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    src.connect(bp); bp.connect(g); g.connect(this.master); src.start(now);
    const o = ac.createOscillator(), og = ac.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(520, now); o.frequency.exponentialRampToValueAtTime(260, now + 0.04);
    og.gain.setValueAtTime(0.18, now); og.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    o.connect(og); og.connect(this.master); o.start(now); o.stop(now + 0.06);
  }

  playShake(power) {   // water swish + a few glassy chimes
    if (!this.ac) return;
    const ac = this.ac, now = ac.currentTime, n = Math.floor(ac.sampleRate * 0.5);
    const nb = ac.createBuffer(1, n, ac.sampleRate), d = nb.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource(); src.buffer = nb;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 3;
    lp.frequency.setValueAtTime(400, now); lp.frequency.exponentialRampToValueAtTime(1400, now + 0.15); lp.frequency.exponentialRampToValueAtTime(300, now + 0.5);
    const g = ac.createGain(); g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(0.14 * power, now + 0.06); g.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    src.connect(lp); lp.connect(g); g.connect(this.sfxBus); src.start(now);
    const notes = [1567.98, 1975.53, 2349.32, 2637.02, 3135.96];
    for (let i = 0; i < 4; i++) this.tone(this.sfxBus, notes[(Math.random() * notes.length) | 0], 0.05 * power, 0.9, 0.04 + i * 0.07 + rnd(0, 0.03));
  }

  startMelody() {
    if (!this.ac) return;
    if (this.audioEl) {
      clearTimeout(this.fileT);
      this.fileGain.gain.cancelScheduledValues(this.ac.currentTime);
      this.fileGain.gain.setTargetAtTime(1, this.ac.currentTime, 0.1);
      this.audioEl.currentTime = 0; this.audioEl.play().catch(() => {});
      return;
    }
    this.musicBus.gain.cancelScheduledValues(this.ac.currentTime);
    this.musicBus.gain.setTargetAtTime(1, this.ac.currentTime, 0.05);
    this.slot = 0; this.slotT = SLOT_SEC;
  }

  stopMelody() {
    if (!this.ac) return;
    if (this.audioEl) {
      this.fileGain.gain.setTargetAtTime(0, this.ac.currentTime, 0.25);
      this.fileT = setTimeout(() => this.audioEl.pause(), 900);
      return;
    }
    this.musicBus.gain.setTargetAtTime(0, this.ac.currentTime, 0.25);
  }

  updateMelody(dt) {
    if (this.audioEl) { this.audioEl.playbackRate = Math.max(0.4, this.speed); return; }
    if (!this.playing || !this.ac) return;
    this.slotT += dt * this.speed;
    while (this.slotT >= SLOT_SEC) {
      this.slotT -= SLOT_SEC;
      const sl = SLOTS[this.slot % SLOTS.length]; this.slot++;
      if (sl.m) this.chime(sl.m, 0.3);
      if (sl.b) this.chime(sl.b, sl.bv, true);
    }
  }

  /* ===================== PLAY STATE ===================== */
  setPlaying(on) {
    this.playing = on;
    this.touch();
    if (on) {
      $('lead').classList.add('off');
      if (!this.everOn) {
        this.everOn = true;
        $('vol').classList.add('show');
        setTimeout(() => $('wish-open').classList.add('show'), 3800);
      }
      this.planLanding();
      this.shake(0.5, false);
      this.startMelody();
    } else {
      this.stopMelody();
      this.releaseIOS(3000);
      this.idleSince = performance.now(); this.idleDelay = 5000;
    }
  }

  // choose where the turntable stops: a whole number of turns ahead, about 2 turns per wind
  planLanding() {
    const TAU = Math.PI * 2, E = Math.max(this.energy, 0.05);
    this.landT = Math.ceil((this.theta + 0.6 * RUN_SECONDS * E) / TAU) * TAU;
    this.landK = (this.landT - this.theta) / E;
  }

  /* ---------- wind-up key ---------- */
  wind() {
    if (this.playing || this.windT < 1 || this.windCount >= WIND_TURNS) return;
    this.initAudio();
    this.windCount++;
    this.windFrom = this.keyAngle; this.windTo = this.keyAngle + Math.PI * 2; this.windT = 0;
    this.touch(); this.idleDelay = 5000;
    this.playTick();
  }

  updateKey(dt) {
    if (this.windT < 1) {
      const prev = this.keyAngle, step = Math.PI / 3;
      this.windT = Math.min(1, this.windT + dt / 0.8);
      const e = 1 - Math.pow(1 - this.windT, 3);
      this.keyAngle = this.windFrom + (this.windTo - this.windFrom) * e;
      if (Math.floor(this.keyAngle / step) !== Math.floor(prev / step)) this.playTick();
      if (this.windT >= 1 && this.windCount >= WIND_TURNS && !this.playing) { this.energy = 1; this.setPlaying(true); }
    } else if (this.playing) {
      this.speed = 0.25 + 0.75 * smooth(0, 0.2, this.energy);
      this.energy = Math.max(0, this.energy - (dt / RUN_SECONDS) * this.speed);
      this.keyAngle = Math.PI * 2 * WIND_TURNS * this.energy;
      if (this.energy <= 0) { this.keyAngle = 0; this.windCount = 0; this.speed = 1; this.setPlaying(false); }
    }
    this.flick = (this.playing && this.energy < 0.08 && this.energy > 0) ? 0.6 + 0.4 * Math.random() : 1;
    // the key turns around its horizontal shaft: seen from the front its wings fold up and open again
    this.keyEl.setAttribute('transform', `scale(1 ${Math.cos(this.keyAngle).toFixed(3)})`);
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 700);
    this.keyGlow.setAttribute('opacity', ((0.45 + 0.55 * pulse) * (1 - 0.7 * this.level)).toFixed(3));
  }

  /* ---------- idle notice ---------- */
  touch() { this.idleSince = performance.now(); this.setHint(false); }
  setHint(show) { this.hintOn = show; $('key-hint').classList.toggle('show', show); }
  updateHint() {
    const idle = performance.now() - this.idleSince;
    const can = !this.playing && !this.dragging && this.windT >= 1 && idle > this.idleDelay;
    if (can !== this.hintOn) this.setHint(can);
    if (this.hintOn) {
      const r = $('key-hit').getBoundingClientRect(), h = $('key-hint');
      const x = clamp(r.left + r.width / 2 - h.offsetWidth / 2, 8, innerWidth - h.offsetWidth - 8);
      const y = r.top - h.offsetHeight - 2;
      h.style.transform = `translate(${x}px, ${y}px)`;
    }
  }

  /* ===================== GLOBE ===================== */
  buildGround() {
    let d = `M30 370 L30 ${groundY(30)}`;
    for (let x = 30; x <= 370; x += 6) d += ` L${x} ${groundY(x).toFixed(1)}`;
    $('ground').setAttribute('d', d + ' L370 370 Z');
    this.keyEl = $('key'); this.keyGlow = $('key-glow');
    this.lit = $('lit'); this.glassEl = $('glass'); this.warm = $('warm-el'); this.pool = $('pool-el'); this.all = $('globe-all');
  }

  buildCouple() {
    const holder = $('couple');
    const doll = (front, back, scale) => {
      const g = document.createElementNS(NS, 'g');
      g.innerHTML = `<ellipse cx="0" cy="0" rx="24" ry="4" fill="#000" opacity=".35"/><g class="f">${front}</g><g class="b">${back}</g>`;
      holder.appendChild(g);
      return { g, f: g.querySelector('.f'), b: g.querySelector('.b'), scale };
    };
    this.holder = holder;
    this.dolls = [doll(BRIDE_FRONT, BRIDE_BACK, 1.26), doll(GROOM_FRONT, GROOM_BACK, 1.35)];
    this.rim = [];
    for (let i = 0; i < 12; i++) {
      const c = document.createElementNS(NS, 'circle'); c.setAttribute('r', 2.2); c.setAttribute('fill', '#f1d28a');
      $('rim-dots').appendChild(c); this.rim.push(c);
    }
  }

  drawCouple() {
    const th = this.theta, c = Math.cos(th), s = Math.sin(th), D = 28, side = [-1, 1];   // bride left, groom right
    const facing = c >= 0, sx = Math.pow(Math.max(0.22, Math.abs(c)), 0.7);
    const order = [];
    this.dolls.forEach((d, i) => {
      const x = side[i] * D * c, z = side[i] * D * s;       // z > 0 = nearer the viewer
      const k = d.scale * (1 + z * 0.003);
      d.g.setAttribute('transform', `translate(${(CX + x).toFixed(2)} ${(TT_Y + 1 + z * 0.18).toFixed(2)}) scale(${(sx * k).toFixed(3)} ${k.toFixed(3)})`);
      d.f.style.display = facing ? '' : 'none'; d.b.style.display = facing ? 'none' : '';
      order.push([z, d.g]);
    });
    order.sort((a, b) => a[0] - b[0]).forEach(([, g]) => { if (this.holder.lastChild !== g) this.holder.appendChild(g); });
    this.rim.forEach((el, i) => {
      const a = th + (i / this.rim.length) * Math.PI * 2, f = Math.sin(a);
      el.setAttribute('cx', (CX + 76 * Math.cos(a)).toFixed(2)); el.setAttribute('cy', (TT_Y + 14 * f).toFixed(2));
      el.setAttribute('opacity', f > 0 ? 0.95 : 0.2);
    });
  }

  buildPetals() {
    this.parts = [];
    const back = $('petals-back'), front = $('petals-front');
    for (let i = 0; i < PETALS; i++) {
      const glitter = i % 7 === 0;
      let el;
      if (glitter) {
        el = document.createElementNS(NS, 'circle'); el.setAttribute('r', rnd(0.9, 1.6)); el.setAttribute('fill', '#ffe3a3');
      } else {
        el = document.createElementNS(NS, 'use'); el.setAttribute('href', '#petal'); el.setAttribute('fill', `url(#p${i % 4})`);
      }
      (Math.random() < 0.5 ? front : back).appendChild(el);
      const x = rnd(-140, 140);
      this.parts.push({
        el, glitter, x, y: groundY(CX + x) - CY - 2, vx: 0, vy: 0, rest: true,
        ph: rnd(0, 6.3), rot: rnd(0, 360), vr: 0, flip: rnd(0, 6.3), vf: rnd(2, 5), s: rnd(0.8, 1.35), a: 1
      });
    }
  }

  shake(power = 1, sound = true) {
    // every petal gets its own random spot anywhere inside the glass, plus a swirl around the centre
    const lift = clamp(power + 0.25, 0, 1), k = 1.7 * clamp(power, 0.45, 1.2), swirl = rnd(-1, 1) > 0 ? 1 : -1;
    for (const p of this.parts) {
      if (Math.random() > lift) continue;
      let tx, ty;
      do { tx = rnd(-1, 1) * R_IN; ty = rnd(-1, 1) * R_IN; } while (tx * tx + ty * ty > R_IN * R_IN * 0.82 || ty > 95);
      const dx = tx - p.x, dy = ty - p.y;
      p.rest = false;
      p.vx = dx * k + (-p.y) * 0.5 * swirl + rnd(-30, 30);
      p.vy = dy * k - 18 + p.x * 0.5 * swirl + rnd(-30, 30);
      p.vr = rnd(-420, 420) * power; p.vf = rnd(2, 6);
    }
    this.wobble = Math.min(1, 0.4 + power * 0.6);
    if (sound) { this.initAudio(); this.playShake(power); this.releaseIOS(); }
    this.touch();
  }

  updatePetals(dt, t) {
    // while the music plays, keep a slow rain of petals by lifting settled ones back to the top
    if (this.playing && this.level > 0.3) {
      this.reliftT += dt;
      if (this.reliftT > 0.16) {
        this.reliftT = 0;
        const rest = this.parts.filter((p) => p.rest);
        if (rest.length > 20) {
          const p = rest[(Math.random() * rest.length) | 0];
          p.rest = false; p.x = rnd(-100, 100); p.y = rnd(-140, -110); p.vx = p.vy = 0; p.a = 0;
        }
      }
    }
    const drag = Math.exp(-1.6 * dt);
    for (const p of this.parts) {
      if (!p.rest) {
        p.vy += (p.glitter ? 10 : 20) * dt;
        p.vx *= drag; p.vy *= drag; p.vr *= drag;
        if (this.dragging) p.vx += this.omega * 30 * dt;          // turning the globe stirs the water
        p.x += (p.vx + Math.sin(t * 1.8 + p.ph) * (p.glitter ? 4 : 10)) * dt;
        p.y += p.vy * dt;
        p.rot += (p.vr + Math.sin(t + p.ph) * 40) * dt;
        p.flip += p.vf * dt;
        const d = Math.hypot(p.x, p.y);
        if (d > R_IN) { p.x *= R_IN / d; p.y *= R_IN / d; p.vx *= -0.3; p.vy *= -0.3; }
        const gy = groundY(CX + p.x) - CY - 2;
        if (p.y >= gy && p.vy >= 0) { p.y = gy; p.rest = true; p.vx = p.vy = 0; }
      }
      p.a = Math.min(1, p.a + dt * 1.2);
      const X = (CX + p.x).toFixed(2), Y = (CY + p.y).toFixed(2);
      if (p.glitter) {
        p.el.setAttribute('cx', X); p.el.setAttribute('cy', Y);
        p.el.setAttribute('opacity', (p.a * (0.35 + 0.65 * Math.abs(Math.sin(t * 3 + p.ph)))).toFixed(2));
      } else {
        const sx = p.rest ? Math.max(0.55, Math.abs(Math.cos(p.flip))) : Math.cos(p.flip);
        const sy = p.rest ? 0.55 : 1;   // settled petals lie flat
        p.el.setAttribute('transform', `translate(${X} ${Y}) rotate(${p.rot.toFixed(1)}) scale(${(sx * p.s).toFixed(3)} ${(sy * p.s).toFixed(3)})`);
        p.el.setAttribute('opacity', p.a.toFixed(2));
      }
    }
  }

  /* ---------- input: tap globe = shake, drag = turn, tap key = wind, shake phone = shake ---------- */
  bindGlobe() {
    const hit = $('globe-hit'), svg = $('globe');
    let d = null;
    const unit = () => 380 / svg.getBoundingClientRect().width;
    hit.addEventListener('pointerdown', (e) => {
      hit.setPointerCapture(e.pointerId);
      d = { x0: e.clientX, x: e.clientX, t0: performance.now(), t: performance.now(), moved: 0 };
      this.touch();
    });
    hit.addEventListener('pointermove', (e) => {
      if (!d) return;
      const now = performance.now(), dt = Math.max(8, now - d.t) / 1000;
      d.moved = Math.max(d.moved, Math.abs(e.clientX - d.x0));
      if (d.moved > 6) {
        this.dragging = true;
        const dth = (e.clientX - d.x) * unit() * 0.016;
        this.theta += dth; this.omega = this.omega * 0.5 + (dth / dt) * 0.5;
      }
      d.x = e.clientX; d.t = now;
    });
    const end = () => {
      if (!d) return;
      if (d.moved <= 6 && performance.now() - d.t0 < 450) this.shake(1);
      if (this.dragging && this.playing) this.planLanding();
      else if (this.dragging) this.landT = Math.round(this.theta / (Math.PI * 2)) * Math.PI * 2;
      this.dragging = false; d = null;
    };
    hit.addEventListener('pointerup', end);
    hit.addEventListener('pointercancel', end);
    hit.addEventListener('click', () => this.askMotion());   // iOS motion permission needs a click

    $('key-hit').addEventListener('click', () => this.wind());

    if (DEVICE_SHAKE && 'DeviceMotionEvent' in window && typeof DeviceMotionEvent.requestPermission !== 'function') this.listenMotion();
  }

  askMotion() {
    if (!DEVICE_SHAKE || this.motionAsked || !window.DeviceMotionEvent || typeof DeviceMotionEvent.requestPermission !== 'function') return;
    this.motionAsked = true;
    DeviceMotionEvent.requestPermission()
      .then((s) => { if (s === 'granted') this.listenMotion(); else this.toast('แตะลูกแก้วเพื่อเขย่าแทนได้นะ'); })
      .catch(() => {});
  }

  listenMotion() {
    if (this.motionOn) return;
    this.motionOn = true;
    let prev = null, lastShake = 0;
    addEventListener('devicemotion', (e) => {
      const a = e.accelerationIncludingGravity; if (!a || a.x == null) return;
      if (prev) {
        const j = Math.abs(a.x - prev.x) + Math.abs(a.y - prev.y) + Math.abs(a.z - prev.z), now = performance.now();
        if (j > 22 && now - lastShake > 450 && !this.formOpen) { lastShake = now; this.shake(clamp(j / 40, 0.6, 1.3)); }
      }
      prev = { x: a.x, y: a.y, z: a.z };
    });
  }

  toast(text) {
    const el = $('toast'); el.textContent = text; el.classList.add('show');
    clearTimeout(this.toastT); this.toastT = setTimeout(() => el.classList.remove('show'), 3500);
  }

  /* ===================== LAYOUT + FX ===================== */
  resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2), fx = $('fx-canvas');
    this.W = innerWidth; this.H = innerHeight;
    fx.width = this.W * dpr; fx.height = this.H * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // aim the spotlight at the glass
    const r = $('globe-hit').getBoundingClientRect(), app = $('app').getBoundingClientRect();
    const gx = r.left + r.width / 2 - app.left, gy = r.top + r.height / 2 - app.top, gr = r.width / 2;
    const beam = $('beam'), bw = gr * 2.6, cx = this.W / 2;
    beam.style.left = `${cx - bw / 2}px`; beam.style.width = `${bw}px`; beam.style.height = `${gy + gr * 1.15}px`;
    this.beamBox = { x: cx, top: 0, bottom: gy + gr * 0.4, w: gr * 1.6 };
  }

  initFx() {
    this.ctx = $('fx-canvas').getContext('2d');
    this.motes = Array.from({ length: 34 }, () => ({ u: Math.random(), v: Math.random(), sp: rnd(0.01, 0.035), ph: rnd(0, 6.3), r: rnd(0.6, 1.6) }));
  }

  drawFx(dt, t) {   // dust drifting in the spotlight
    const c = this.ctx, b = this.beamBox; c.clearRect(0, 0, this.W, this.H);
    if (!b || this.level < 0.02) return;
    for (const m of this.motes) {
      m.v = (m.v + m.sp * dt) % 1;
      const y = b.top + m.v * (b.bottom - b.top), spread = 0.2 + 0.8 * m.v;
      const x = b.x + (m.u - 0.5) * b.w * spread + Math.sin(t * 0.6 + m.ph) * 6;
      c.globalAlpha = this.level * 0.55 * Math.sin(m.v * Math.PI) * (0.5 + 0.5 * Math.sin(t * 1.7 + m.ph));
      c.fillStyle = '#ffe2ae'; c.beginPath(); c.arc(x, y, m.r, 0, 6.283); c.fill();
    }
    c.globalAlpha = 1;
  }

  layoutTitle() {
    const run = () => {
      const a = $('t-ploy'), b = $('t-wai'), h = $('t-heart'), svg = a.ownerSVGElement;
      const gap = 24, hw = 66;
      const pb = a.getBBox(), hcx = pb.x + pb.width + gap + hw / 2;
      h.setAttribute('transform', `translate(${hcx} 50)`);
      b.setAttribute('x', 0);
      b.setAttribute('x', hcx + hw / 2 + gap - b.getBBox().x);
      const wb = b.getBBox();
      svg.setAttribute('viewBox', `0 0 ${Math.ceil(wb.x + wb.width + 10)} 105`);
    };
    run();
    if (document.fonts && document.fonts.load) document.fonts.load('700 80px Gaegu').then(run).catch(() => {});
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { run(); this.resize(); });
  }

  /* ===================== UI (volume + wishes, same as before) ===================== */
  bindUI() {
    addEventListener('wish:submit', () => this.shake(0.8));   // a little petal burst for every wish
    // volume
    const vol = $('vol'), btn = $('vol-btn'), range = $('vol-range'), waves = $('vol-waves');
    let idle;
    const sleep = () => { clearTimeout(idle); idle = setTimeout(() => vol.classList.remove('open'), 2500); };
    const icon = () => {
      const v = this.muted ? 0 : this.volume;
      waves.innerHTML = v === 0 ? '<path d="M16 9.5l5 5M21 9.5l-5 5"></path>'
        : v < 0.5 ? '<path d="M16 9.5a3.6 3.6 0 010 5"></path>'
        : '<path d="M16 9a4.6 4.6 0 010 6"></path><path d="M18.6 6.5a8.2 8.2 0 010 11"></path>';
      range.style.setProperty('--v', (this.muted ? 0 : this.volume * 100) + '%');
    };
    icon();
    btn.addEventListener('click', () => {
      if (!vol.classList.contains('open')) { vol.classList.add('open'); }
      else { this.muted = !this.muted; this.applyVolume(); icon(); }
      sleep();
    });
    range.addEventListener('input', () => {
      this.volume = range.value / 100; this.muted = false; this.applyVolume(); icon(); sleep();
    });
    vol.addEventListener('pointerdown', sleep);
    document.addEventListener('pointerdown', (e) => { if (!vol.contains(e.target)) vol.classList.remove('open'); });

    // wishes
    const modal = $('wish-modal'), send = $('wish-send'), card = $('wish-card');
    let nameEl = $('wish-name'), msgEl = $('wish-msg');
    const vInput = $('wish-video'), vInfo = $('wish-video-info'), vPrev = $('wish-video-preview');
    const vErr = $('wish-video-err'), cardVid = $('wish-card-video');
    let file = null, fileUrl = null, cardUrl = null;
    const refresh = () => { send.disabled = !(chars(msgEl.value.trim()).length || file); };
    const limit = (el, counter, lim) => {
      const upd = () => {
        const a = chars(el.value);
        if (a.length > lim) el.value = a.slice(0, lim).join('');
        const n = chars(el.value).length;
        counter.textContent = `${n}/${lim}`;
        counter.classList.toggle('full', n >= lim);
        refresh();
      };
      el.addEventListener('input', (e) => { if (!e.isComposing) upd(); else counter.textContent = `${chars(el.value).length}/${lim}`; });
      el.addEventListener('compositionend', upd);
    };
    limit(nameEl, $('name-count'), LIM_NAME);
    limit(msgEl, $('msg-count'), LIM_MSG);
    // iOS offers "Undo Typing" when the phone is shaken after typing in a text box.
    // Swapping in fresh copies of the fields (keeping what was typed) drops that typing history.
    const freshFields = () => {
      [nameEl, msgEl].forEach((el) => el.blur());
      const swap = (el) => { const n = el.cloneNode(false); n.value = el.value; el.replaceWith(n); return n; };
      nameEl = swap(nameEl); msgEl = swap(msgEl);
      limit(nameEl, $('name-count'), LIM_NAME); limit(msgEl, $('msg-count'), LIM_MSG);
    };

    const showErr = (t) => { vErr.textContent = t; vErr.hidden = !t; };
    const clearVideo = () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
      file = null; fileUrl = null; vInput.value = ''; vInfo.hidden = true; vPrev.removeAttribute('src'); refresh();
    };
    $('wish-video-btn').addEventListener('click', () => vInput.click());
    $('wish-video-remove').addEventListener('click', () => { clearVideo(); showErr(''); });
    vInput.addEventListener('change', () => {
      const f = vInput.files[0]; if (!f) return;
      showErr('');
      if (!f.type.startsWith('video/')) { showErr('กรุณาเลือกไฟล์วิดีโอ'); vInput.value = ''; return; }
      if (f.size > MAX_VIDEO_MB * 1024 * 1024) { showErr(`ไฟล์ใหญ่เกิน ${MAX_VIDEO_MB} MB`); vInput.value = ''; return; }
      const url = URL.createObjectURL(f), probe = document.createElement('video');
      probe.preload = 'metadata';
      probe.onloadedmetadata = () => {
        if (probe.duration > VIDEO_MAX + 0.5) {
          URL.revokeObjectURL(url); showErr(`วิดีโอยาว ${Math.round(probe.duration)} วินาที เกินกำหนด ${VIDEO_MAX} วินาที`); vInput.value = ''; return;
        }
        clearVideo(); file = f; fileUrl = url; vPrev.src = url; vInfo.hidden = false; refresh();
      };
      probe.onerror = () => { URL.revokeObjectURL(url); showErr('เปิดไฟล์วิดีโอนี้ไม่ได้ ลองไฟล์อื่น'); vInput.value = ''; };
      probe.src = url;
    });

    const openM = () => { this.formOpen = true; modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false'); setTimeout(() => nameEl.focus(), 250); };
    const closeM = () => {
      const wasOpen = modal.classList.contains('open');
      setConfirm(false); modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true');
      if (wasOpen) { freshFields(); setTimeout(() => { this.formOpen = false; }, 600); }
    };
    $('wish-open').addEventListener('click', openM);
    $('wish-cancel').addEventListener('click', closeM);
    modal.addEventListener('pointerdown', (e) => { if (e.target === modal) closeM(); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape') closeM(); });
    const doSend = () => {
      const name = nameEl.value.trim(), msg = msgEl.value.trim();
      if (!msg && !file) return;
      // hook for your backend: window.addEventListener('wish:submit', e => e.detail.{name,message,video})
      window.dispatchEvent(new CustomEvent('wish:submit', { detail: { name, message: msg, video: file } }));
      $('wish-card-from').textContent = 'จาก ' + (name || 'ไม่ระบุนาม');
      $('wish-card-msg').textContent = msg; $('wish-card-msg').hidden = !msg;
      cardVid.pause(); if (cardUrl) { URL.revokeObjectURL(cardUrl); cardUrl = null; }
      if (file) { cardUrl = URL.createObjectURL(file); cardVid.src = cardUrl; cardVid.hidden = false; }
      else { cardVid.removeAttribute('src'); cardVid.hidden = true; }
      card.classList.add('show');
      nameEl.value = ''; msgEl.value = ''; clearVideo(); showErr('');
      $('name-count').textContent = `0/${LIM_NAME}`; $('msg-count').textContent = `0/${LIM_MSG}`;
      send.disabled = true; closeM();
    };
    // ask to confirm before anything is sent (warn about empty name / message, preview the video)
    const confirmEl = $('wish-confirm'), sheet = document.querySelector('.sheet'), cv = $('confirm-video-player');
    const setConfirm = (v) => {
      confirmEl.hidden = !v; sheet.classList.toggle('confirming', v);
      if (!v) { cv.pause(); cv.removeAttribute('src'); cv.hidden = true; }
    };
    send.addEventListener('click', () => {
      const name = nameEl.value.trim(), msg = msgEl.value.trim();
      if (!msg && !file) return;
      $('confirm-from').textContent = 'จาก ' + (name || 'ไม่ระบุนาม');
      $('confirm-msg').textContent = msg; $('confirm-msg').hidden = !msg;
      if (file) { cv.src = fileUrl; cv.hidden = false; } else { cv.removeAttribute('src'); cv.hidden = true; }
      const warn = $('confirm-warn');
      const missing = [];
      if (!name) missing.push('ชื่อ');
      if (!msg) missing.push('คำอวยพร');
      warn.textContent = missing.length ? `คุณยังไม่ได้ใส่${missing.join('และ')} ยืนยันที่จะส่งแบบนี้ไหม?` : '';
      warn.hidden = !missing.length;
      setConfirm(true);
    });
    $('confirm-back').addEventListener('click', () => setConfirm(false));
    $('confirm-ok').addEventListener('click', () => { cv.pause(); setConfirm(false); doSend(); });
    $('wish-card-close').addEventListener('click', () => { card.classList.remove('show'); cardVid.pause(); });
  }

  /* ===================== LOOP ===================== */
  loop(t) {
    requestAnimationFrame((n) => this.loop(n));
    const dt = Math.min(0.033, (t - this.last) / 1000); this.last = t;
    const tm = t / 1000;

    // light: slow reveal when the music starts, gentle fade when it stops
    this.reveal = clamp(this.reveal + (this.playing ? dt / 3.2 : -dt / 1.8), 0, 1);
    const e = easeSine(this.reveal);
    this.level = smooth(0.25, 1, e);
    const L = this.level * (this.flick || 1);
    this.lit.setAttribute('opacity', (0.42 + 0.58 * L).toFixed(3));
    this.glassEl.setAttribute('opacity', (0.55 + 0.45 * L).toFixed(3));
    this.warm.setAttribute('opacity', (0.25 + 0.75 * L).toFixed(3));
    this.pool.setAttribute('opacity', L.toFixed(3));
    const bo = (Math.min(1, e * 1.6) * (this.flick || 1)).toFixed(3);
    $('beam').style.opacity = bo; $('beam-src').style.opacity = bo;

    const ti = $('title'), want = this.playing && this.reveal > 0.35;
    if (want && !this.titleOn) {
      this.titleOn = true; clearTimeout(this.titleT);
      ti.classList.remove('play'); void ti.offsetWidth; ti.classList.add('play', 'show');
    } else if (!want && this.titleOn && !this.playing) {
      this.titleOn = false; ti.classList.remove('show');
      this.titleT = setTimeout(() => ti.classList.remove('play'), 1500);
    }

    this.updateKey(dt);
    this.updateMelody(dt);

    // turntable. While the music plays the angle is tied to the spring (theta = landT - landK * energy),
    // so it always comes to rest exactly facing the guest when the music runs out.
    if (!this.dragging) {
      if (this.playing) {
        const goal = this.landT - this.landK * this.energy;
        this.theta += (goal - this.theta) * Math.min(1, dt * 2.5);
      } else if (this.reveal > 0) {
        this.theta += (this.landT - this.theta) * Math.min(1, dt * 2.5);   // finish the last few degrees
        this.omega = 0;
      } else {
        this.omega *= Math.exp(-1.6 * dt);                                  // coast after a drag…
        this.theta += this.omega * dt;
        if (Math.abs(this.omega) < 0.2) {                                   // …then turn back to face front
          const goal = Math.round(this.theta / (Math.PI * 2)) * Math.PI * 2;
          this.theta += (goal - this.theta) * Math.min(1, dt * 1.4);
        }
      }
    }
    this.drawCouple();
    this.updatePetals(dt, tm);

    this.wobble = Math.max(0, this.wobble - dt * 1.8);
    const w = this.wobble * this.wobble;
    this.all.setAttribute('transform', `rotate(${(Math.sin(tm * 26) * 3.5 * w).toFixed(2)} 200 462) translate(${(Math.sin(tm * 31) * 3 * w).toFixed(2)} 0)`);

    this.updateHint();
    this.drawFx(dt, tm);
  }
}

addEventListener('DOMContentLoaded', () => { window.app = new App(); });
})();
