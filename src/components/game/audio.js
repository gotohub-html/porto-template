// Procedural Web Audio engine for BACK2ROOM. No audio files — every sound is
// synthesized at runtime. One AudioContext, one master gain, helpers for the
// ambient bed plus one-shots (footsteps, upload chime, static, pickups).

export class GameAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.humGain = null;
    this.hissGain = null;
    this.sting = null; // entity proximity drone gain
    this.muted = false;
  }

  // Must be called from a user gesture (autoplay policy).
  start() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : 0.5;
    master.connect(ctx.destination);
    this.master = master;

    // 60Hz mains hum + 120Hz harmonic + 36Hz dread drone
    const hum = ctx.createGain();
    hum.gain.value = 0.08;
    hum.connect(master);
    this.humGain = hum;
    [
      [36, "sine", 1.4],
      [60, "sine", 1],
      [120, "triangle", 0.4],
    ].forEach(([f, type, g]) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      const og = ctx.createGain();
      og.gain.value = g;
      o.connect(og);
      og.connect(hum);
      o.start();
    });

    // filtered white-noise hiss (fluorescent gas leak)
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 7200;
    const hg = ctx.createGain();
    hg.gain.value = 0.012;
    noise.connect(bp);
    bp.connect(hg);
    hg.connect(master);
    noise.start();
    this.hissGain = hg;

    // flicker LFO on master
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.5;
    const lg = ctx.createGain();
    lg.gain.value = 0.03;
    lfo.connect(lg);
    lg.connect(master.gain);
    lfo.start();

    // entity proximity sting — silent until the entity is near
    const sting = ctx.createGain();
    sting.gain.value = 0;
    sting.connect(master);
    const so = ctx.createOscillator();
    so.type = "sawtooth";
    so.frequency.value = 42;
    const sf = ctx.createBiquadFilter();
    sf.type = "lowpass";
    sf.frequency.value = 220;
    so.connect(sf);
    sf.connect(sting);
    so.start();
    this.sting = sting;
  }

  resume() {
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
  }

  setMuted(m) {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.1);
    }
  }

  // Entity proximity: 0 (far) → 1 (on top of you). Raises the drone + detunes it.
  setEntityProximity(p) {
    if (!this.ctx || !this.sting) return;
    const t = this.ctx.currentTime;
    this.sting.gain.setTargetAtTime(p * 0.22, t, 0.15);
  }

  // Battery <5%: bend the ambient pitch down for dread.
  setDistress(level) {
    if (!this.ctx || !this.humGain) return;
    const t = this.ctx.currentTime;
    this.humGain.gain.setTargetAtTime(0.08 + level * 0.18, t, 0.2);
  }

  // A single footstep on linoleum. pan in [-1,1], gain scales with proximity/own.
  footstep(pan = 0, gain = 0.12) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const dur = 0.12;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      const env = 1 - i / d.length;
      d[i] = (Math.random() * 2 - 1) * env * env;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 320 + Math.random() * 120;
    const g = ctx.createGain();
    g.gain.value = gain;
    const panner = ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    src.connect(lp);
    lp.connect(g);
    g.connect(panner);
    panner.connect(this.master);
    src.start(t);
  }

  // 3-tone dial-up-ish upload chime.
  uploadChime() {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    [660, 880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = "square";
      o.frequency.value = f;
      const g = ctx.createGain();
      const t0 = now + i * 0.14;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.13);
      o.connect(g);
      g.connect(this.master);
      o.start(t0);
      o.stop(t0 + 0.16);
    });
  }

  // Soft confirmation blip for picking up a packet or battery.
  pickup() {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = "triangle";
    o.frequency.setValueAtTime(440, now);
    o.frequency.exponentialRampToValueAtTime(880, now + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.1, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    o.connect(g);
    g.connect(this.master);
    o.start(now);
    o.stop(now + 0.2);
  }

  // VHS static burst — death / glitch transition.
  staticBurst(dur = 0.5) {
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 800;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.7, now + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    src.connect(hp);
    hp.connect(g);
    g.connect(this.master);
    src.start(now);
  }

  dispose() {
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}
