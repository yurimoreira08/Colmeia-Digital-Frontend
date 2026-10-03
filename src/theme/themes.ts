export type AppThemeName = 'petroleo-digital' | 'verde-floresta' | 'obsidian-dark';

export type AppThemeColors = {
  background: string;
  surface: string;
  headerBackground: string;
  card: string;
  cardBorder: string;
  accent: string;
  accentSoft: string;
  warmAccent: string;
  buttonBackground: string;
  buttonText: string;
  inputBackground: string;
  inputBorder: string;
  textPrimary: string;
  textMuted: string;
  divider: string;
  error: string;
  dockBackground: string;
  dockActive: string;
  glowA: string;
  glowB: string;
};

export const themes: Record<AppThemeName, AppThemeColors> = {
  'petroleo-digital': {
    background: '#F4F7F6',
    surface: '#FFFFFF',
    headerBackground: '#0E4F55',
    card: '#FFFFFF',
    cardBorder: '#E2E8F0',
    accent: '#16808C',
    accentSoft: '#E6F4F5',
    warmAccent: '#E26D5C',
    buttonBackground: '#0E4F55',
    buttonText: '#FFFFFF',
    inputBackground: '#FFFFFF',
    inputBorder: '#CBD5E1',
    textPrimary: '#0F172A',
    textMuted: '#64748B',
    divider: '#E2E8F0',
    error: '#DC2626',
    dockBackground: '#FFFFFF',
    dockActive: '#0E4F55',
    glowA: '#16808C',
    glowB: '#0E4F55',
  },
  'verde-floresta': {
    background: '#F1F5F2',
    surface: '#FFFFFF',
    headerBackground: '#1A4331',
    card: '#FFFFFF',
    cardBorder: '#D8E2DC',
    accent: '#2D6A4F',
    accentSoft: '#E8F5EE',
    warmAccent: '#D97706',
    buttonBackground: '#1A4331',
    buttonText: '#FFFFFF',
    inputBackground: '#FFFFFF',
    inputBorder: '#B7C9BE',
    textPrimary: '#14281D',
    textMuted: '#52796F',
    divider: '#D8E2DC',
    error: '#B91C1C',
    dockBackground: '#FFFFFF',
    dockActive: '#1A4331',
    glowA: '#2D6A4F',
    glowB: '#1A4331',
  },
  'obsidian-dark': {
    background: '#0B1319',
    surface: '#13222B',
    headerBackground: '#13222B',
    card: '#13222B',
    cardBorder: '#223A48',
    accent: '#1FB6C6',
    accentSoft: '#1A3D47',
    warmAccent: '#F87171',
    buttonBackground: '#1FB6C6',
    buttonText: '#0B1319',
    inputBackground: '#192D38',
    inputBorder: '#2A4B5D',
    textPrimary: '#F1F5F9',
    textMuted: '#94A3B8',
    divider: '#223A48',
    error: '#EF4444',
    dockBackground: '#13222B',
    dockActive: '#1FB6C6',
    glowA: '#1FB6C6',
    glowB: '#0E4F55',
  },
};

export const themeLabel: Record<AppThemeName, string> = {
  'petroleo-digital': 'Petróleo Digital (Padrão)',
  'verde-floresta': 'Verde Floresta',
  'obsidian-dark': 'Obsidian Escuro',
};
