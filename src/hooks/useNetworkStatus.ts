import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * Returns whether the device currently has a network connection.
 * On web: uses navigator.onLine + online/offline events.
 * On native: always returns true (requires NetInfo for full support).
 */
export function useNetworkStatus(): { isOnline: boolean } {
  const getOnline = () => {
    if (Platform.OS !== 'web') return true;
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine;
  };

  const [isOnline, setIsOnline] = useState(getOnline);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const on  = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online',  on);
      window.removeEventListener('offline', off);
    };
  }, []);

  return { isOnline };
}
