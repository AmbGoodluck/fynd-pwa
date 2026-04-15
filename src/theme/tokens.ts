export const COLORS = {
  background: '#FFFAF8',       // Warm off-white
  surface: '#FFFFFF',

  text: {
    primary: '#1A1019',        // Deep warm black
    secondary: '#3D3540',      // Dark muted
    tertiary: '#6E6577',       // Medium muted
    hint: '#9E95A8',           // Light muted
    disabled: '#C8C2CE',       // Very light
    inverse: '#FFFFFF',
  },

  accent: {
    primary: '#E8503A',        // Coral — primary action color
    primaryLight: '#FFF0EE',   // Coral tint
    primaryDark: '#C93E2B',    // Coral dark
    sage: '#2D8E62',           // Green — success, positive states
    sageLight: '#EAF6F0',
    amber: '#E5940A',          // Amber — warnings, ratings
    amberLight: '#FFF7E6',
    plum: '#7B4FC4',           // Purple — special, discovery
    plumLight: '#F3EDFC',
    sky: '#3B82C4',            // Blue — info, links
    skyLight: '#EBF3FA',
    danger: '#DC3545',
    dangerLight: '#FEE2E2',
    warning: '#E5940A',
  },

  border: {
    light: 'rgba(26, 16, 25, 0.05)',
    default: 'rgba(26, 16, 25, 0.08)',
    dark: 'rgba(26, 16, 25, 0.12)',
  },

  card: {
    background: '#FFFFFF',
    border: 'rgba(26, 16, 25, 0.05)',
    shadow: 'rgba(26, 16, 25, 0.05)',
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 40,
};

export const TYPOGRAPHY = {
  hero:         { fontSize: 28, fontWeight: '800' as const, color: COLORS.text.primary },
  title:        { fontSize: 22, fontWeight: '700' as const, color: COLORS.text.primary },
  sectionTitle: { fontSize: 20, fontWeight: '700' as const, color: COLORS.text.primary },
  cardTitle:    { fontSize: 15, fontWeight: '700' as const, color: COLORS.text.primary },
  body:         { fontSize: 14, fontWeight: '500' as const, color: COLORS.text.secondary },
  bodySmall:    { fontSize: 13, fontWeight: '500' as const, color: COLORS.text.tertiary },
  caption:      { fontSize: 12, fontWeight: '600' as const, color: COLORS.text.hint },
  label:        { fontSize: 11, fontWeight: '700' as const, color: COLORS.text.hint },
  chip:         { fontSize: 12, fontWeight: '700' as const },
};

export const RADIUS = {
  xs: 8,
  sm: 10,
  md: 14,
  lg: 16,
  xl: 20,
  full: 9999,
};
