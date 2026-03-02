import { Platform, StatusBar } from 'react-native';

export const HEADER_TOP_PADDING = Platform.OS === 'android' 
  ? (StatusBar.currentHeight || 24) + 8
  : 0;
