import { useContext } from 'react';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';

/**
 * Safe version of useBottomTabBarHeight — returns 0 when called outside a
 * Bottom Tab Navigator instead of throwing. Use this in screens that can be
 * rendered either as a tab screen or as a stack screen.
 */
export function useTabBarHeight(): number {
  return useContext(BottomTabBarHeightContext) ?? 0;
}
