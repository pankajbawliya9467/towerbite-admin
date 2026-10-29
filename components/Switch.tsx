export function Switch({ on, onChange, label, disabled }: {
  on: boolean; onChange: (on: boolean) => void; label: string; disabled?: boolean;
}) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled}
      className={`switch${on ? ' on' : ''}`} onClick={() => onChange(!on)} />
  );
}

/** A labelled switch row used inside forms. */
export function SwitchRow({ label, on, onChange }: { label: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className="row" style={{ height: 52, padding: '0 16px', border: '1.5px solid var(--line)', borderRadius: 14 }}>
      <span style={{ fontWeight: 500 }}>{label}</span>
      <Switch on={on} onChange={onChange} label={label} />
    </label>
  );
}
