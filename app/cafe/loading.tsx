/** Shown at once when moving between cafe pages (the sidebar stays). */
export default function Loading() {
  return (
    <main className="page" aria-busy="true" aria-label="Loading">
      <div className="skel-block" style={{ width: 220, height: 34 }} />
      <div className="skel-block" style={{ width: 360, maxWidth: '100%', height: 16, marginTop: 12 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14, marginTop: 28 }}>
        {[0, 1, 2, 3].map((i) => <div key={i} className="skel-block" style={{ height: 110 }} />)}
      </div>
      <div className="skel-block" style={{ height: 260, marginTop: 16 }} />
    </main>
  );
}
