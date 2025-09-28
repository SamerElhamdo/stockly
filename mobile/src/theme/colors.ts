export type PaletteColor = {
  main: string;
  light: string;
  dark: string;
  shadow: string;
};

export type SoftPalette = {
  primary: PaletteColor;
  success: PaletteColor;
  warning: PaletteColor;
  destructive: PaletteColor;
  info: PaletteColor;
};

const createPalette = (main: string, light: string, dark: string, shadow: string): PaletteColor => ({
  main,
  light,
  dark,
  shadow,
});

export const lightSoftPalette: SoftPalette = {
  // Align with web: primary hsl(219 78% 58%) ≈ #2D73FF
  primary: createPalette('#2D73FF', '#EAF0FF', '#1E55CC', 'rgba(45, 115, 255, 0.28)'),
  success: createPalette('#16A34A', '#E9F7EF', '#0F7A37', 'rgba(22, 163, 74, 0.26)'),
  warning: createPalette('#F59E0B', '#FFF4E5', '#B45309', 'rgba(245, 158, 11, 0.28)'),
  destructive: createPalette('#EF4444', '#FEE8E8', '#B91C1C', 'rgba(239, 68, 68, 0.33)'),
  info: createPalette('#6366F1', '#EEF2FF', '#4338CA', 'rgba(99, 102, 241, 0.30)'),
};

export const darkSoftPalette: SoftPalette = {
  primary: createPalette('#60A5FA', '#1E293B', '#1D4ED8', 'rgba(96, 165, 250, 0.4)'),
  success: createPalette('#34D399', '#1F2937', '#059669', 'rgba(52, 211, 153, 0.35)'),
  warning: createPalette('#FBBF24', '#312E81', '#F59E0B', 'rgba(251, 191, 36, 0.35)'),
  destructive: createPalette('#F87171', '#3F1D2D', '#DC2626', 'rgba(248, 113, 113, 0.45)'),
  info: createPalette('#818CF8', '#1F2937', '#4C1D95', 'rgba(129, 140, 248, 0.45)'),
};

export type ThemeColors = {
  name: 'light' | 'dark';
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceMuted: string;
  border: string;
  cardShadow: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  divider: string;
  softPalette: SoftPalette;
};

export const lightThemeColors: ThemeColors = {
  name: 'light',
  background: '#F4F6FB',
  surface: '#FFFFFF',
  surfaceElevated: '#EDF2FA',
  surfaceMuted: '#E6ECF6',
  border: 'rgba(15, 23, 42, 0.10)',
  cardShadow: 'rgba(15, 23, 42, 0.06)',
  textPrimary: '#0F172A',
  textSecondary: 'rgba(15, 23, 42, 0.75)',
  textMuted: 'rgba(15, 23, 42, 0.55)',
  divider: 'rgba(15, 23, 42, 0.08)',
  softPalette: lightSoftPalette,
};

export const darkThemeColors: ThemeColors = {
  name: 'dark',
  background: '#0F172A',
  surface: '#111827',
  surfaceElevated: '#1E293B',
  surfaceMuted: '#1F2937',
  border: 'rgba(255, 255, 255, 0.10)',
  cardShadow: 'rgba(15, 23, 42, 0.60)',
  textPrimary: '#F8FAFC',
  textSecondary: 'rgba(248, 250, 252, 0.88)',
  textMuted: 'rgba(248, 250, 252, 0.65)',
  divider: 'rgba(255, 255, 255, 0.06)',
  softPalette: darkSoftPalette,
};
