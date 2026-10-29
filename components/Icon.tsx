/** Line icons in the mockup's style (24px grid, 2px stroke). */
const PATHS = {
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  down: <path d="M6 9l6 6 6-6" />,
  back: <path d="M15 18l-6-6 6-6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  edit: <path d="M4 20h4L19 9l-4-4L4 16z" />,
  trash: <><path d="M4 7h16M9 7V4h6v3" /><path d="M6 7l1 13h10l1-13" /></>,
  expand: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  logout: <><path d="M14 4h5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-5" /><path d="M10 16l-4-4 4-4M6 12h10" /></>,
  upload: <><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></>,
  board: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16M15 4v16" /></>,
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = '1em' }: { name: IconName; size?: number | string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flex: 'none' }}>
      {PATHS[name]}
    </svg>
  );
}
