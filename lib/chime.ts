let ctx: AudioContext | null = null;

/** Browsers only allow sound after a user gesture: call this from one. */
export function unlockAudio() {
  ctx ??= new AudioContext();
  return ctx.resume();
}

export const audioReady = () => ctx?.state === 'running';

/** A short two-note chime for a new order. */
export function chime() {
  if (!ctx) return;
  const t = ctx.currentTime;
  [880, 1320].forEach((freq, i) => {
    const osc = ctx!.createOscillator();
    const gain = ctx!.createGain();
    const start = t + i * 0.18;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.35, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.4);
    osc.connect(gain).connect(ctx!.destination);
    osc.start(start);
    osc.stop(start + 0.45);
  });
}
