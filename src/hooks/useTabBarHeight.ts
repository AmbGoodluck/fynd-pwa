import { useContext } from 'react';
import { Platform } from 'react-native';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';

/**
 * Safe version of useBottomTabBarHeight — returns 0 when called outside a
 * Bottom Tab Navigator instead of throwing. Use this in screens that can be
 * rendered either as a tab screen or as a stack screen.
 *
 * On web the tab bar is in normal document flow (not absolute positioned),
 * so screens do not need extra bottom padding — always returns 0.
 */
export function useTabBarHeight(): number {
  const ctx = useContext(BottomTabBarHeightContext) ?? 0;
  return Platform.OS === 'web' ? 0 : ctx;
}
