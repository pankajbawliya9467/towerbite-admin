export function StatTile({ label, value, sub, tint, dot }: { label: string; value: string | number; sub?: string; tint?: string; dot?: string }) {
  return (
    <div className="card stat">
      <div className="row">
        <div className="cap">{label}</div>
        {dot && <span className="stat-dot" style={{ background: tint }} aria-hidden><i style={{ background: dot }} /></span>}
      </div>
      <div className="v">{value}</div>
      {sub && <div className="s">{sub}</div>}
    </div>
  );
}
