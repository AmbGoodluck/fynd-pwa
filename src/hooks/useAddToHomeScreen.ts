/**
 * useAddToHomeScreen — detects platform, manages eligibility, dismissal,
 * and surfaces the A2HS prompt at the right moment.
 *
 * Web-only. Returns safe defaults on native platforms and during SSR.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { Platform } from 'react-native';

// ── Types ─────────────────────────────────────────────────────────────────────

export type A2HSPlatform =
  | 'chrome-android'
  | 'chrome-desktop'
  | 'safari-ios'
  | 'safari-macos'
  | 'unsupported';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export interface UseAddToHomeScreenReturn {
  shouldShow: boolean;
  platform: A2HSPlatform;
  isStandalone: boolean;
  dismiss: () => void;
  triggerInstall: () => Promise<void>;
  showInstructions: boolean;
  setShowInstructions: (v: boolean) => void;
  canInstall: boolean;
}

// ── localStorage keys ─────────────────────────────────────────────────────────

const KEY_SESSION    = 'fynd_a2hs_session_count';
const KEY_ELIGIBLE   = 'fynd_a2hs_eligible';
const KEY_DISMISSED  = 'fynd_a2hs_dismissed';
const KEY_DISMISS_CT = 'fynd_a2hs_dismiss_count';
const KEY_INSTALLED  = 'fynd_a2hs_installed';

// ── Module-scoped session flag — resets on page reload ───────────────────────
let hasShownThisSession = false;

// ── Standalone detection ──────────────────────────────────────────────────────

function checkIsStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

// ── Platform detection ────────────────────────────────────────────────────────

function detectPlatform(): A2HSPlatform {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'unsupported';

  const ua = navigator.userAgent;
  const isChrome = /Chrome/.test(ua) && !/Edg\//.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua) && !/CriOS/.test(ua);
  const isFirefox = /Firefox/.test(ua);
  const isSamsung = /SamsungBrowser/.test(ua);

  if (isFirefox || isSamsung) return 'unsupported';

  // iOS Chrome (CriOS) — doesn't support A2HS
  if (/CriOS/.test(ua)) return 'unsupported';

  const isIOS =
    /iPhone|iPad|iPod/.test(ua) ||
    (navigator.maxTouchPoints > 0 && /Macintosh/.test(ua));

  if (isSafari && isIOS) return 'safari-ios';
  if (isSafari && /Macintosh/.test(ua)) return 'safari-macos';

  // Chrome (Chromium-based) — beforeinstallprompt will fire
  if (isChrome) {
    return /Android/.test(ua) ? 'chrome-android' : 'chrome-desktop';
  }

  return 'unsupported';
}

// ── Eligibility helpers ───────────────────────────────────────────────────────

function isEligible(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const eligible = localStorage.getItem(KEY_ELIGIBLE) === 'true';
    if (eligible) return true;
    const sessions = parseInt(localStorage.getItem(KEY_SESSION) || '0', 10);
    return sessions >= 2;
  } catch {
    return false;
  }
}

function isDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (localStorage.getItem(KEY_INSTALLED) === 'true') return true;
    const count = parseInt(localStorage.getItem(KEY_DISMISS_CT) || '0', 10);
    if (count >= 3) return true;
    const ts = localStorage.getItem(KEY_DISMISSED);
    if (!ts) return false;
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    return Date.now() - new Date(ts).getTime() < sevenDays;
  } catch {
    return false;
  }
}

function incrementSession(): void {
  if (typeof window === 'undefined') return;
  try {
    const prev = parseInt(localStorage.getItem(KEY_SESSION) || '0', 10);
    localStorage.setItem(KEY_SESSION, String(prev + 1));
  } catch {}
}

// ── Standalone exported function — call from any screen on meaningful action ─

/**
 * markA2HSEligible — call this when the user completes a meaningful action:
 *   - Opens a place detail view (SuggestedPlacesScreen / CategoryPlaces)
 *   - Saves a place or moment
 *   - Taps a trending category card (TrendingSection)
 *
 * It's idempotent — safe to call multiple times.
 */
export function markA2HSEligible(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY_ELIGIBLE, 'true');
  } catch {}
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAddToHomeScreen(): UseAddToHomeScreenReturn {
  const isWeb = Platform.OS === 'web';

  // Safe SSR / native defaults
  const [platform] = useState<A2HSPlatform>(() =>
    isWeb ? detectPlatform() : 'unsupported'
  );
  const [standalone] = useState<boolean>(() =>
    isWeb ? checkIsStandalone() : false
  );
  const [shouldShow, setShouldShow] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  // Increment session count once per mount
  useEffect(() => {
    if (!isWeb) return;
    incrementSession();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // beforeinstallprompt (Chrome/Edge only)
  useEffect(() => {
    if (!isWeb || typeof window === 'undefined') return;
    if (platform !== 'chrome-android' && platform !== 'chrome-desktop') return;

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;

      // Only surface if eligible and not dismissed
      if (!hasShownThisSession && isEligible() && !isDismissed() && !standalone) {
        hasShownThisSession = true;
        setShouldShow(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [isWeb, platform, standalone]);

  // appinstalled event
  useEffect(() => {
    if (!isWeb || typeof window === 'undefined') return;
    const handler = () => {
      try { localStorage.setItem(KEY_INSTALLED, 'true'); } catch {}
      setShouldShow(false);
      deferredPrompt.current = null;
    };
    window.addEventListener('appinstalled', handler);
    return () => window.removeEventListener('appinstalled', handler);
  }, [isWeb]);

  // Safari: show based on eligibility (no event — just check on mount)
  useEffect(() => {
    if (!isWeb) return;
    if (platform !== 'safari-ios' && platform !== 'safari-macos') return;
    if (hasShownThisSession || standalone || isDismissed() || !isEligible()) return;
    hasShownThisSession = true;
    setShouldShow(true);
  }, [isWeb, platform, standalone]);

  const dismiss = useCallback(() => {
    setShouldShow(false);
    setShowInstructions(false);
    try {
      localStorage.setItem(KEY_DISMISSED, new Date().toISOString());
      const prev = parseInt(localStorage.getItem(KEY_DISMISS_CT) || '0', 10);
      localStorage.setItem(KEY_DISMISS_CT, String(prev + 1));
    } catch {}
  }, []);

  const triggerInstall = useCallback(async () => {
    if (platform === 'safari-ios' || platform === 'safari-macos') {
      setShowInstructions(true);
      return;
    }
    if (!deferredPrompt.current) return;
    try {
      await deferredPrompt.current.prompt();
      const choice = await deferredPrompt.current.userChoice;
      if (choice.outcome === 'accepted') {
        setShouldShow(false);
        deferredPrompt.current = null;
      } else {
        dismiss();
      }
    } catch {}
  }, [platform, dismiss]);

  const canInstall =
    platform !== 'unsupported' &&
    !standalone &&
    localStorage !== undefined;

  return {
    shouldShow,
    platform,
    isStandalone: standalone,
    dismiss,
    triggerInstall,
    showInstructions,
    setShowInstructions,
    canInstall,
  };
}
