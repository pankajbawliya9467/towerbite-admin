export function Mark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" aria-hidden style={{ flex: 'none' }}>
      <path d="M40 5C24 5 12 17 12 32c0 19 28 43 28 43s28-24 28-43C68 17 56 5 40 5z" fill="#E8590C" />
      <path d="M27 27h22v8a11 11 0 0 1-22 0z" fill="#fff" />
      <path d="M49 29.5h2.5a4.5 4.5 0 0 1 0 9H49" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <path d="M33 15c-2 2.5 2 4.5 0 7M40 13c-2 2.5 2 4.5 0 7" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="logo">
      <Mark />
      <span>Tower<span style={{ color: 'var(--accent)' }}>Bites</span></span>
    </span>
  );
}
