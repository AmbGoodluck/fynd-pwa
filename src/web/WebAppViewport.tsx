import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

const MAX_WIDTH = 440;
const BACKDROP = '#0F172A';

type Props = { children: React.ReactNode };

export default function WebAppViewport({ children }: Props) {
  const isWeb = Platform.OS === 'web';

  if (!isWeb) return <>{children}</>;

  return (
    <View style={styles.viewport}>
      <View style={styles.deviceShell}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: {
    width: '100%',
    height: '100dvh',
    minHeight: '100vh',
    backgroundColor: BACKDROP,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  deviceShell: {
    width: '100%',
    height: '100%',
    maxWidth: MAX_WIDTH,
    minHeight: '100vh',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    flexDirection: 'column',
    // Ensure content is never clipped by iOS home indicator / Android nav bar
    ...(Platform.OS === 'web'
      ? ({ paddingBottom: 'env(safe-area-inset-bottom, 0px)' } as any)
      : {}),
  },
});
