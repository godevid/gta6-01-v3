// Sound: everything is synthesised with WebAudio — no audio files. Engine hum,
// sirens, gunshots, pickups and a little mission jingle, plus a slow bass line
// that plays while driving at night. All of it guards against a missing or
// locked AudioContext, so the game still runs silent in a headless screenshot.

export function makeAudio() {
  const A = {
    ctx: null, muted: false, engineOsc: null, engineGain: null, musicTimer: 0, musicStep: 0,
    ensure() {
      if (A.ctx) return true;
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return false;
        A.ctx = new Ctx();
        A.master = A.ctx.createGain();
        A.master.gain.value = 0.5;
        A.master.connect(A.ctx.destination);
        A.engineOsc = A.ctx.createOscillator();
        A.engineOsc.type = 'sawtooth';
        A.engineOsc.frequency.value = 50;
        A.engineGain = A.ctx.createGain();
        A.engineGain.gain.value = 0;
        const filter = A.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 420;
        A.engineOsc.connect(filter);
        filter.connect(A.engineGain);
        A.engineGain.connect(A.master);
        A.engineOsc.start();
        return true;
      } catch {
        return false;
      }
    },
    resume() { if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume().catch(() => {}); },
    tone(freq, dur, type, vol, slideTo) {
      if (!A.ctx || A.muted) return;
      try {
        const o = A.ctx.createOscillator();
        const g = A.ctx.createGain();
        o.type = type || 'square';
        o.frequency.value = freq;
        if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, A.ctx.currentTime + dur);
        g.gain.value = vol || 0.12;
        g.gain.exponentialRampToValueAtTime(0.001, A.ctx.currentTime + dur);
        o.connect(g); g.connect(A.master);
        o.start(); o.stop(A.ctx.currentTime + dur);
      } catch { /* silent */ }
    },
    noise(dur, vol, lowpass) {
      if (!A.ctx || A.muted) return;
      try {
        const len = Math.floor(A.ctx.sampleRate * dur);
        const buf = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
        const src = A.ctx.createBufferSource();
        src.buffer = buf;
        const g = A.ctx.createGain();
        g.gain.value = vol || 0.25;
        const f = A.ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = lowpass || 1800;
        src.connect(f); f.connect(g); g.connect(A.master);
        src.start();
      } catch { /* silent */ }
    },
    engine(speed, driving) {
      if (!A.ctx || !A.engineGain) return;
      const target = driving ? 0.05 + Math.min(0.11, Math.abs(speed) / 4200) : 0;
      A.engineGain.gain.setTargetAtTime(A.muted ? 0 : target, A.ctx.currentTime, 0.1);
      A.engineOsc.frequency.setTargetAtTime(48 + Math.abs(speed) * 0.28, A.ctx.currentTime, 0.1);
    },
    siren(dt, active) {
      if (!A.ctx || A.muted) return;
      A._sirenT = (A._sirenT || 0) + dt;
      if (!active || A._sirenT < 0.55) return;
      A._sirenT = 0;
      A._sirenHigh = !A._sirenHigh;
      A.tone(A._sirenHigh ? 880 : 660, 0.5, 'sine', 0.045);
    },
    shot() { A.noise(0.12, 0.3, 3200); A.tone(160, 0.08, 'square', 0.1, 60); },
    punch() { A.noise(0.08, 0.2, 900); },
    hurt() { A.tone(220, 0.18, 'sawtooth', 0.12, 110); },
    pickup() { A.tone(660, 0.1, 'sine', 0.12); setTimeout(() => A.tone(990, 0.14, 'sine', 0.12), 90); },
    emptyClick() { A.tone(1200, 0.04, 'square', 0.06); },
    explosion() { A.noise(0.7, 0.4, 500); A.tone(70, 0.6, 'sine', 0.2, 30); },
    jingle() {
      const notes = [523, 659, 784, 1047];
      notes.forEach((n, i) => setTimeout(() => A.tone(n, 0.22, 'triangle', 0.14), i * 130));
    },
    busted() { A.tone(392, 0.4, 'sawtooth', 0.14, 196); },
    wasted() { A.tone(330, 0.5, 'sawtooth', 0.14, 110); setTimeout(() => A.tone(220, 0.7, 'sawtooth', 0.14, 82), 300); },
    music(dt, night) {
      if (!A.ctx || A.muted || !night) return;
      A.musicTimer += dt;
      if (A.musicTimer < 0.42) return;
      A.musicTimer = 0;
      // A slow A-minor bass walk for night driving.
      const bass = [55, 55, 65.4, 49, 55, 55, 82.4, 73.4];
      A.tone(bass[A.musicStep % bass.length], 0.38, 'triangle', 0.07);
      A.musicStep++;
    },
    toggleMute() { A.muted = !A.muted; return A.muted; },
  };
  return A;
}
