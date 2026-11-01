let ctx: AudioContext | null = null;

/** Browsers only allow sound after a user gesture: call this from one. */
export function unlockAudio() {
  ctx ??= new AudioContext();
  return ctx.resume();
}

export const audioReady = () => ctx?.state === 'running';

/** New-order sounds the cafe can pick from (made in the browser, no sound files). */
export const SOUNDS = [
  { id: 'chime', name: 'Chime', hint: 'Two soft notes' },
  { id: 'bell', name: 'Counter bell', hint: 'Like a hotel desk bell' },
  { id: 'ding', name: 'Ding dong', hint: 'Doorbell' },
  { id: 'marimba', name: 'Marimba', hint: 'Short and happy' },
  { id: 'alarm', name: 'Loud alarm', hint: 'For a noisy kitchen' },
] as const;
export type SoundId = (typeof SOUNDS)[number]['id'];

export type SoundSettings = { sound: SoundId; volume: number; repeat: boolean };
const KEY = 'tb.sound';
const DEFAULTS: SoundSettings = { sound: 'chime', volume: 0.8, repeat: true };
const listeners = new Set<(s: SoundSettings) => void>();

/** Saved on this device (each counter tablet can have its own sound). */
export function getSoundSettings(): SoundSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (saved && SOUNDS.some((s) => s.id === saved.sound)) return { ...DEFAULTS, ...saved };
  } catch {
    // private mode or bad data: use the defaults
  }
  return DEFAULTS;
}

export function setSoundSettings(next: SoundSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // still applies for this visit
  }
  listeners.forEach((l) => l(next));
}

export function onSoundSettings(cb: (s: SoundSettings) => void) {
  listeners.add(cb);
  return () => void listeners.delete(cb);
}

type Note = { freq: number; at: number; len: number; type?: OscillatorType; gain?: number };

function play(notes: Note[], volume: number) {
  if (!ctx) return;
  const t = ctx.currentTime + 0.01;
  const master = ctx.createGain();
  master.gain.value = Math.max(0.05, Math.min(1, volume));
  master.connect(ctx.destination);
  for (const n of notes) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const start = t + n.at;
    const peak = n.gain ?? 0.35;
    osc.type = n.type ?? 'sine';
    osc.frequency.value = n.freq;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(peak, start + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, start + n.len);
    osc.connect(g).connect(master);
    osc.start(start);
    osc.stop(start + n.len + 0.05);
  }
}

const PATTERNS: Record<SoundId, Note[]> = {
  chime: [
    { freq: 880, at: 0, len: 0.4 },
    { freq: 1320, at: 0.18, len: 0.45 },
  ],
  bell: [
    // a bright strike with a ringing overtone, twice
    ...[0, 0.55].flatMap((at) => [
      { freq: 2093, at, len: 1.1, gain: 0.3 },
      { freq: 5274, at, len: 0.5, gain: 0.08 },
      { freq: 1046, at, len: 0.9, type: 'triangle' as const, gain: 0.12 },
    ]),
  ],
  ding: [
    { freq: 1318, at: 0, len: 0.9, type: 'triangle', gain: 0.4 },
    { freq: 1046, at: 0.45, len: 1.2, type: 'triangle', gain: 0.4 },
  ],
  marimba: [523, 659, 784, 1046].map((freq, i) => ({ freq, at: i * 0.11, len: 0.28, gain: 0.32 })),
  alarm: Array.from({ length: 6 }, (_, i) => ({ freq: i % 2 ? 740 : 990, at: i * 0.2, len: 0.17, type: 'square' as const, gain: 0.22 })),
};

/** Plays the cafe's chosen sound (or `id`, for the "test" button). */
export function chime(id?: SoundId) {
  const s = getSoundSettings();
  play(PATTERNS[id ?? s.sound], s.volume);
}
