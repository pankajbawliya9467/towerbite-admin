export function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card stat">
      <div className="cap">{label}</div>
      <div className="v">{value}</div>
    </div>
  );
}
