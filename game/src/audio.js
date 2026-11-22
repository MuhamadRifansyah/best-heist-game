// audio.js — synthesized WebAudio bleeps only, no audio files.
// Every sound is a tiny oscillator envelope built at run time, so the
// game ships zero audio assets and makes zero network requests.

export function makeAudio() {
  let context = null;
  let muted = false;
  let humNodes = null;

  function ensure() {
    if (!context) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      context = new AC();
    }
    if (context.state === 'suspended') context.resume();
    return context;
  }

  function blip(freq, seconds, type, volume, slideTo) {
    if (muted) return;
    const ctx = ensure();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + seconds);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + seconds);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + seconds);
  }

  return {
    unlock() { ensure(); },
    toggleMute() {
      muted = !muted;
      if (muted) this.stopHum();
      return muted;
    },
    isMuted() { return muted; },
    step() { blip(520, 0.05, 'triangle', 0.05); },
    coin() { blip(1320, 0.16, 'sine', 0.12, 1760); },
    grabTick() { blip(880, 0.08, 'square', 0.06); },
    loot() {
      blip(660, 0.12, 'sine', 0.12);
      setTimeout(() => blip(990, 0.18, 'sine', 0.12), 110);
      setTimeout(() => blip(1320, 0.28, 'sine', 0.12), 230);
    },
    spotted() { blip(180, 0.35, 'sawtooth', 0.14, 420); },
    busted() {
      blip(220, 0.25, 'sawtooth', 0.16, 110);
      setTimeout(() => blip(160, 0.4, 'sawtooth', 0.16, 70), 220);
    },
    win() {
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip(f, 0.3, 'triangle', 0.12), i * 130));
    },
    // A quiet low drone while the alarm is high, so tension is audible.
    startHum() {
      if (muted || humNodes) return;
      const ctx = ensure();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 55;
      gain.gain.value = 0.05;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      humNodes = { osc, gain };
    },
    stopHum() {
      if (!humNodes) return;
      try { humNodes.osc.stop(); } catch { /* already stopped */ }
      humNodes = null;
    },
  };
}
