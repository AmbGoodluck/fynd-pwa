import React, { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

const MAX_WIDTH = 440;
const BACKDROP = '#0F172A';

type Props = { children: React.ReactNode };

function getViewportHeight(): number {
  if (typeof window === 'undefined') return 0;
  const vv = window.visualViewport?.height;
  const wh = window.innerHeight;
  const dh = document.documentElement?.clientHeight;
  const h = vv || wh || dh || 0;
  return Math.max(320, Math.round(h));
}

export default function WebAppViewport({ children }: Props) {
  const isWeb = Platform.OS === 'web';
  const [viewportHeight, setViewportHeight] = useState(() => (isWeb ? getViewportHeight() : 0));

  useEffect(() => {
    if (!isWeb || typeof window === 'undefined') return;

    const update = () => setViewportHeight(getViewportHeight());
    update();

    const vv = window.visualViewport;
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    vv?.addEventListener('resize', update);
    vv?.addEventListener('scroll', update);

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      vv?.removeEventListener('resize', update);
      vv?.removeEventListener('scroll', update);
    };
  }, [isWeb]);

  const deviceShellStyle = useMemo(
    () => [styles.deviceShell, isWeb ? { height: viewportHeight || undefined } : null],
    [isWeb, viewportHeight]
  );

  if (!isWeb) return <>{children}</>;

  return (
    <View style={styles.viewport}>
      <View style={deviceShellStyle}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: {
    flex: 1,
    minHeight: 0,
    backgroundColor: BACKDROP,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceShell: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    minHeight: 0,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    flexDirection: 'column',
  },
});
