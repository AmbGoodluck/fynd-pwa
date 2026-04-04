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
    backgroundColor: BACKDROP,
    alignItems: 'center',
    justifyContent: 'flex-start',
    // Web flex container so child fills properly
    ...(Platform.OS === 'web'
      ? ({ display: 'flex' as any, flexDirection: 'column' as any } as any)
      : {}),
  },
  deviceShell: {
    width: '100%',
    flex: 1,
    maxWidth: MAX_WIDTH,
    backgroundColor: '#FFFFFF',
    flexDirection: 'column',
    overflow: 'hidden',
  },
});
