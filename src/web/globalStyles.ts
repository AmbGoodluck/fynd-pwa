/**
 * globalStyles.ts — web-only CSS injection.
 *
 * Called once at app startup (before any component renders).
 * Enforces:
 *   • 440 px max-width centred container (mobile-on-desktop experience)
 *   • Dark backdrop on large screens
 *   • One-finger vertical scroll on all touch devices
 *   • 300 ms tap-delay removal
 *   • Hidden scrollbars (clean native look)
 *   • PWA meta tags + web-app manifest link
 */
import { Platform } from 'react-native';

const FYND_GREEN = '#22C55E';
const BACKDROP   = '#0F172A';  // deep navy — visible on desktop sides
const MAX_WIDTH  = 440;

export function injectWebGlobalStyles(): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (document.getElementById('fynd-web-styles')) return;   // idempotent

  // ── PWA meta tags ──────────────────────────────────────────────────────────
  type MetaEntry = [string, string];
  const metas: MetaEntry[] = [
    ['theme-color',                       FYND_GREEN],
    ['apple-mobile-web-app-capable',      'yes'],
    ['apple-mobile-web-app-status-bar-style', 'default'],
    ['mobile-web-app-capable',            'yes'],
    ['apple-mobile-web-app-title',        'Fynd'],
  ];
  metas.forEach(([name, content]) => {
    if (!document.querySelector(`meta[name="${name}"]`)) {
      const m = document.createElement('meta');
      m.name    = name;
      m.content = content;
      document.head.appendChild(m);
    }
  });

  // ── Manifest + Apple touch icon ─────────────────────────────────────────────
  if (!document.querySelector('link[rel="manifest"]')) {
    const l = document.createElement('link');
    l.rel  = 'manifest';
    l.href = '/manifest.json';
    document.head.appendChild(l);
  }
  if (!document.querySelector('link[rel="apple-touch-icon"]')) {
    const l = document.createElement('link');
    l.rel  = 'apple-touch-icon';
    l.href = '/icon.png';
    document.head.appendChild(l);
  }

  // ── Global CSS ─────────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.id = 'fynd-web-styles';
  style.textContent = `
    html {
      overscroll-behavior: none;
      -webkit-text-size-adjust: 100%;
    }

    body {
      background-color: ${BACKDROP};
      display: flex;
      justify-content: center;
      min-height: 100dvh;
      min-height: 100vh;
      margin: 0;
      overscroll-behavior: none;
      -webkit-tap-highlight-color: transparent;
    }

    /* ── Centred 440 px app shell ─────────────────────────────────────── */
    #root {
      max-width: ${MAX_WIDTH}px !important;
      width: 100% !important;
      flex: 1;
      display: flex;
      flex-direction: column;
      background-color: #fff;
      position: relative;
      overflow: hidden;
      box-shadow: 0 0 80px rgba(0, 0, 0, 0.55);
    }

    /* ── One-finger vertical scroll on every overflow container ─────────── */
    * {
      -webkit-overflow-scrolling: touch;
    }

    /* ── Hide scrollbars (clean native feel) ────────────────────────────── */
    *::-webkit-scrollbar { display: none; }
    * {
      scrollbar-width: none;
      -ms-overflow-style: none;
    }

    /* ── Prevent accidental text selection on interactive elements ───────── */
    button, [role="button"] {
      user-select: none;
      -webkit-user-select: none;
    }

    /* ── Prevent iOS Safari text zoom on focus (font must be ≥ 16 px) ───── */
    input, textarea, select {
      font-size: max(16px, 1em) !important;
    }

    /* ── RN Modal portals must cover the full viewport, not the 440 px slot  */
    [data-testid="modal-backdrop"],
    [aria-modal="true"],
    .rn-modal-host {
      position: fixed !important;
      inset: 0 !important;
    }
  `;
  document.head.appendChild(style);
}
