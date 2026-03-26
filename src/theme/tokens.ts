export const COLORS = {
  // Backgrounds
  background: '#FFFFFF',
  surface: '#F8F9FA',

  text: {
    primary: '#1A1A1A',
    secondary: '#6B7280',
    tertiary: '#9CA3AF',
    inverse: '#FFFFFF',
  },

  accent: {
    primary: '#10B981',
    primaryDark: '#059669',
    danger: '#EF4444',
    dangerLight: '#FEE2E2',
    warning: '#F59E0B',
  },

  border: {
    light: '#F3F4F6',
    default: '#E5E7EB',
    dark: '#D1D5DB',
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
};

export const TYPOGRAPHY = {
  title:        { fontSize: 20, fontWeight: '600' as const, color: COLORS.text.primary },
  sectionTitle: { fontSize: 17, fontWeight: '600' as const, color: COLORS.text.primary },
  cardTitle:    { fontSize: 15, fontWeight: '600' as const, color: COLORS.text.primary },
  body:         { fontSize: 14, fontWeight: '400' as const, color: COLORS.text.primary },
  caption:      { fontSize: 12, fontWeight: '400' as const, color: COLORS.text.secondary },
  label:        { fontSize: 11, fontWeight: '500' as const, color: COLORS.text.secondary },
};

export const RADIUS = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  full: 9999,
};
