'use client';
import { Screen } from '@/types/app';

const ITEMS: { key: Screen; label: string; icon: JSX.Element }[] = [
  { key: 'home', label: 'Home', icon: <IconHome /> },
  { key: 'generate', label: 'Generate', icon: <IconSpark /> },
  { key: 'story', label: 'Story', icon: <IconBook /> },
  { key: 'history', label: 'History', icon: <IconClock /> },
  { key: 'usage', label: 'Usage', icon: <IconChart /> },
  { key: 'logs', label: 'Logs', icon: <IconList /> },
  { key: 'settings', label: 'Settings', icon: <IconGear /> },
];

export const SCREEN_TITLE: Record<Screen, string> = {
  home: 'Home',
  generate: 'Generate',
  story: 'Story',
  history: 'History',
  usage: 'Usage',
  logs: 'Logs',
  settings: 'Settings',
};

export default function Sidebar({
  open,
  setOpen,
  screen,
  setScreen,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  screen: Screen;
  setScreen: (s: Screen) => void;
}) {
  if (!open) return null;
  return (
    <>
      <div className="scrim" onClick={() => setOpen(false)} aria-hidden />
      <aside className="drawer" role="dialog" aria-label="Navigation">
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-border">
          <div>
            <div className="text-sm font-semibold">Seedance PoC</div>
            <div className="text-xs text-muted">BytePlus + OpenRouter</div>
          </div>
          <button className="btn-icon" aria-label="Close navigation" onClick={() => setOpen(false)}>
            <IconClose />
          </button>
        </div>
        {ITEMS.map(it => (
          <button
            key={it.key}
            className={`nav-item ${screen === it.key ? 'nav-item-active' : 'nav-item-inactive'}`}
            onClick={() => {
              setScreen(it.key);
              setOpen(false);
            }}
          >
            <span className="shrink-0">{it.icon}</span>
            <span>{it.label}</span>
          </button>
        ))}
      </aside>
    </>
  );
}

export function HamburgerButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="btn-icon" onClick={onClick} aria-label="Open navigation">
      <IconMenu />
    </button>
  );
}

function IconHome() { return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10"/></svg>); }
function IconMenu() { return (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>); }
function IconClose() { return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M6 18L18 6"/></svg>); }
function IconSpark() { return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></svg>); }
function IconClock() { return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>); }
function IconChart() { return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 19V5M4 19h16M8 15v-4M12 15V8M16 15v-7"/></svg>); }
function IconList() { return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>); }
function IconGear() { return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>); }
function IconBook() { return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>); }
