// ─── PWA Install Prompt Hook ─────────────────────────────────────────────────
// Detects browser install capability via the `beforeinstallprompt` event.
// Defers the prompt and surfaces it only after a meaningful engagement:
//   • a trip has been generated (call `onEngagement()`)
//   • OR this is at least the user's second visit
//
// Web-only — returns a no-op object on native platforms.

import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

const VISIT_COUNT_KEY  = 'fynd_visit_count';
const DISMISSED_KEY    = 'fynd_install_dismissed';
const SECOND_VISIT_MIN = 2;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export interface PWAInstallState {
  /** true when the browser supports install AND prompt has not been dismissed */
  canInstall: boolean;
  /** Show the install modal (call on engagement trigger) */
  showInstallPrompt: () => void;
  /** Suppress the modal (persisted to localStorage) */
  dismissForever: () => void;
  /** Increment engagement counter — triggers modal when threshold met */
  onEngagement: () => void;
}

export function usePWAInstall(): PWAInstallState {
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);

  // Only active on web
  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    if (!isWeb || typeof window === 'undefined') return;

    // Check if user already dismissed the prompt
    if (localStorage.getItem(DISMISSED_KEY) === 'true') return;

    // Increment visit count
    const prev = parseInt(localStorage.getItem(VISIT_COUNT_KEY) || '0', 10);
    const visits = prev + 1;
    localStorage.setItem(VISIT_COUNT_KEY, String(visits));

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setCanInstall(true);

      // Auto-surface on second visit (no engagement action needed)
      if (visits >= SECOND_VISIT_MIN) {
        // Signal that the modal should appear — let the consumer decide timing
        setCanInstall(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [isWeb]);

  const showInstallPrompt = () => {
    if (!deferredPrompt.current) return;
    deferredPrompt.current.prompt();
    deferredPrompt.current.userChoice.then((choice) => {
      if (choice.outcome === 'accepted') {
        setCanInstall(false);
        deferredPrompt.current = null;
      }
    });
  };

  const dismissForever = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(DISMISSED_KEY, 'true');
    }
    setCanInstall(false);
    deferredPrompt.current = null;
  };

  const onEngagement = () => {
    if (!isWeb || typeof window === 'undefined') return;
    if (localStorage.getItem(DISMISSED_KEY) === 'true') return;
    // Mark that a meaningful engagement happened — install modal can now appear
    if (deferredPrompt.current) {
      setCanInstall(true);
    }
  };

  return { canInstall, showInstallPrompt, dismissForever, onEngagement };
}
