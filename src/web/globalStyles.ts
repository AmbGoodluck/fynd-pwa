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

export function registerServiceWorker(): void {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  const register = () => {
    navigator.serviceWorker
      .register('/service-worker.js', { scope: '/' })
      .catch(() => {
        // Silent — service worker is a progressive enhancement
      });
  };

  if (typeof window !== 'undefined') {
    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register, { once: true });
    }
  }
}

export function injectWebGlobalStyles(): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (document.getElementById('fynd-web-styles')) return;   // idempotent

  // ── PWA meta tags ──────────────────────────────────────────────────────────
  // Ensure proper viewport meta tag exists for mobile responsiveness
  const existingVP = document.querySelector('meta[name="viewport"]');
  if (existingVP) {
    existingVP.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
  } else {
    const vp = document.createElement('meta');
    vp.name = 'viewport';
    vp.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
    document.head.appendChild(vp);
  }

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

  // ── Ionicons @font-face — MUST be injected synchronously before any render.
  // @expo/vector-icons on web uses CSS fontFamily:'Ionicons' directly.
  // useFonts() is async and unreliable for icon fonts — direct CSS is the fix.
  // The font file is served from /fonts/ (copied from node_modules at build time).
  // 'ionicons' lowercase — must match the fontName in @expo/vector-icons Ionicons.js
  // exactly. This CSS injection is a synchronous fallback; useFonts in App.tsx
  // is the primary loader and also uses 'ionicons' as the key.
  if (!document.getElementById('fynd-icon-font')) {
    const iconFont = document.createElement('style');
    iconFont.id = 'fynd-icon-font';
    iconFont.textContent = `@font-face{font-family:'ionicons';src:url('/fonts/Ionicons.ttf') format('truetype');font-display:block;}`;
    document.head.insertBefore(iconFont, document.head.firstChild);
  }

  // ── Global CSS ─────────────────────────────────────────────────────────────
  // WebAppViewport (React) now owns the 440px shell and live viewport height.
  // CSS here only locks the page surface and keeps RN roots full-height.
  const style = document.createElement('style');
  style.id = 'fynd-web-styles';
  style.textContent = `

    /* ── 0. UNIVERSAL BOX MODEL ─────────────────────────────────────────── */
    *, *::before, *::after {
      box-sizing: border-box;
    }

    /* ── 1. PAGE SURFACE LOCK — outer page never scrolls ────────────────── */
    html {
      height: 100dvh;
      height: -webkit-fill-available;
      width: 100%;
      overflow: hidden;
      overscroll-behavior: none;
      -webkit-text-size-adjust: 100%;
      -moz-text-size-adjust: 100%;
      text-size-adjust: 100%;
    }

    body {
      height: 100dvh;
      height: -webkit-fill-available;
      width: 100%;
      overflow: hidden;
      background-color: ${BACKDROP};
      margin: 0;
      padding: 0;
      overscroll-behavior: none;
      -webkit-tap-highlight-color: transparent;
    }

    /* ── 2. Root host stretches to viewport; React shell handles max-width ─ */
    #root {
      width: 100%;
      height: 100dvh;
      height: -webkit-fill-available;
      overflow: hidden !important;
      display: flex !important;
      flex-direction: column !important;
    }

    #root > div {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }

    /* ── 3. SAFE AREA CSS VARIABLES ─────────────────────────────────────── */
    /*  Available to any component that needs env(safe-area-inset-*)         */
    :root {
      --safe-area-top:    env(safe-area-inset-top,    0px);
      --safe-area-bottom: env(safe-area-inset-bottom, 0px);
      --safe-area-left:   env(safe-area-inset-left,   0px);
      --safe-area-right:  env(safe-area-inset-right,  0px);
    }

    /* ── 4. SCROLLING — touch-optimised, vertical only ─────────────────── */
    * {
      -webkit-overflow-scrolling: touch;
    }

    /* Prevent any child from creating horizontal overflow on the shell     */
    #root > * {
      max-width: 100%;
    }

    /* ── 5. SCROLLBARS — hidden for native-app feel ─────────────────────── */
    *::-webkit-scrollbar { display: none; }
    * {
      scrollbar-width: none;
      -ms-overflow-style: none;
    }

    /* ── 6. MODAL PORTALS — cover full viewport, not just the 440px slot ── */
    /*  React Native Modal renders via a portal outside #root.               */
    /*  position:fixed + inset:0 ensures it covers the entire screen.        */
    [data-testid="modal-backdrop"],
    [aria-modal="true"],
    .rn-modal-host {
      position: fixed !important;
      inset: 0 !important;
      z-index: 9999 !important;
    }

    /* ── 7. iOS SAFARI — prevent zoom on input focus ────────────────────── */
    /*  Font-size must be ≥ 16px to prevent Safari from zooming on focus.   */
    input, textarea, select {
      font-size: max(16px, 1em) !important;
    }

    /* ── 8. INTERACTION — no tap highlight, no accidental text selection ── */
    button, [role="button"] {
      user-select: none;
      -webkit-user-select: none;
    }

    /* ── 9. PERFORMANCE — reduce layout shifts and repaint ──────────────── */
    img {
      content-visibility: auto;
    }
  `;
  document.head.appendChild(style);
}
