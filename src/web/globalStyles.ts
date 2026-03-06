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
  //
  // Architecture: Mobile App Web Container (Airbnb / Uber / Instagram pattern)
  //
  //   html  (height:100%, overflow:hidden)
  //   └── body  (height:100%, overflow:hidden — NEVER scrolls)
  //       └── #root  (max-width:440px, height:100dvh — viewport-locked shell)
  //           └── React Native tree (flex:1 fills the 440px shell)
  //               ├── SafeAreaView / headers  (fixed height)
  //               ├── ScrollView / FlatList   (flex:1, scrolls internally)
  //               └── Bottom bars / Tab bar   (fixed height, always visible)
  //
  // Previous root cause:
  //   • body had `min-height:100dvh` → body could grow and scroll
  //   • #root had `flex:1` with no height anchor → grew with content
  //   • result: entire page scrolled; bottom navigation disappeared
  //
  const style = document.createElement('style');
  style.id = 'fynd-web-styles';
  style.textContent = `

    /* ── 0. UNIVERSAL BOX MODEL ─────────────────────────────────────────── */
    *, *::before, *::after {
      box-sizing: border-box;
    }

    /* ── 1. VIEWPORT LOCK — html + body NEVER scroll ───────────────────── */
    /*                                                                       */
    /*  Setting height:100% on html gives body a concrete parent height.    */
    /*  overflow:hidden on both prevents the outer page from scrolling.     */
    /*  All scrolling happens exclusively inside RN ScrollView / FlatList.  */
    html {
      height: 100%;
      overflow: hidden;
      overscroll-behavior: none;
      -webkit-text-size-adjust: 100%;
      -moz-text-size-adjust: 100%;
      text-size-adjust: 100%;
    }

    body {
      height: 100%;
      overflow: hidden;
      /*
       * position:fixed is the iOS Safari key fix.
       * Without it, iOS Safari's rubber-band scroll affects children even
       * when overflow:hidden is set, preventing inner ScrollViews from
       * receiving touch events reliably.
       * position:fixed locks the body to the viewport as a non-scroll surface.
       * width:100% is required because position:fixed collapses body's width.
       */
      position: fixed;
      width: 100%;
      background-color: ${BACKDROP};
      display: flex;
      justify-content: center;
      align-items: stretch;
      margin: 0;
      padding: 0;
      overscroll-behavior: none;
      -webkit-tap-highlight-color: transparent;
    }

    /* ── 2. APP SHELL — 440px mobile container, viewport-locked ─────────── */
    /*                                                                        */
    /*  height:100vh           → fallback for browsers without dvh support   */
    /*  height:100dvh          → modern: excludes collapsible browser chrome  */
    /*  overflow:hidden        → clips React Native children to this box      */
    /*  isolation:isolate      → creates stacking context for z-index         */
    #root {
      max-width: ${MAX_WIDTH}px !important;
      width: 100% !important;
      height: 100vh;
      height: 100dvh;                           /* overrides ↑ when supported */
      overflow: hidden !important;
      background-color: #ffffff;
      position: relative;
      display: flex !important;
      flex-direction: column !important;
      flex-shrink: 0;
      box-shadow: 0 0 80px rgba(0, 0, 0, 0.55);
      isolation: isolate;
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
  `;
  document.head.appendChild(style);
}
