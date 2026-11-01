'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { SOUNDS, chime, getSoundSettings, onSoundSettings, setSoundSettings, unlockAudio, type SoundSettings as S } from '@/lib/chime';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { SwitchRow } from '@/components/Switch';

/** Sidebar button + dialog to pick the new-order sound, its volume and whether it keeps ringing. */
export function SoundSettings() {
  const [open, setOpen] = useState(false);
  const [s, setS] = useState<S | null>(null);

  useEffect(() => {
    setS(getSoundSettings());
    return onSoundSettings(setS);
  }, []);
  if (!s) return null;

  const update = (patch: Partial<S>) => setSoundSettings({ ...s, ...patch });
  const test = async (id: S['sound']) => {
    await unlockAudio();
    chime(id);
  };
  const current = SOUNDS.find((x) => x.id === s.sound)!;

  return (
    <>
      <button className="side-sound" onClick={() => setOpen(true)} aria-label="New order sound settings">
        <Icon name="bell" size={16} />
        <span>Sound: <b>{current.name}</b></span>
        <Icon name="down" size={14} />
      </button>
      {open && createPortal(
        <Modal title="New order sound" onClose={() => setOpen(false)}>
          <p className="sub" style={{ marginTop: -12, marginBottom: 16 }}>Plays on this device when a new order comes in.</p>
          <div role="radiogroup" aria-label="Sound" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {SOUNDS.map((x) => {
              const on = x.id === s.sound;
              return (
                <div key={x.id} className={`sound-row${on ? ' on' : ''}`}>
                  <button role="radio" aria-checked={on} className="sound-pick" onClick={() => (update({ sound: x.id }), void test(x.id))}>
                    <span className="sound-dot" aria-hidden />
                    <span>
                      <b>{x.name}</b>
                      <small>{x.hint}</small>
                    </span>
                  </button>
                  <button className="btn sec sm" onClick={() => void test(x.id)} aria-label={`Play ${x.name}`}>Play</button>
                </div>
              );
            })}
          </div>
          <label style={{ display: 'block', marginTop: 20 }}>
            <span className="label">Volume</span>
            <input type="range" min={0.1} max={1} step={0.1} value={s.volume} style={{ width: '100%', accentColor: 'var(--accent)' }}
              onChange={(e) => update({ volume: Number(e.target.value) })} onMouseUp={() => void test(s.sound)} onTouchEnd={() => void test(s.sound)} />
          </label>
          <div style={{ marginTop: 16 }}>
            <SwitchRow label="Keep ringing every 30 sec until accepted" on={s.repeat} onChange={(repeat) => update({ repeat })} />
          </div>
          <div className="modal-actions">
            <button className="btn" style={{ flex: 1 }} onClick={() => setOpen(false)}>Done</button>
          </div>
        </Modal>,
        document.body,
      )}
    </>
  );
}
