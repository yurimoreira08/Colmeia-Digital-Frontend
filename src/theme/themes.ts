// PALETA DE CORES OFICIAL DO COLMEIA DIGITAL
export const PALETTE = {
  primaryDark: '#2C4251',     // Primária escura (fundos, headers, botões principais)
  secondaryMedium: '#7798AB', // Secundária média (elementos de apoio, bordas, ícones inativos)
  secondaryLight: '#6DA6B4',  // Secundária clara (destaques, selecionados, hover)
  lightBg: '#BACEE1',         // Fundo claro (backgrounds de card, inputs, telas light)
  lightSurface: '#BACEE1',    // Alias de fundo claro para cards e superfícies
  secondaryDark: '#2C4251',   // Alias para primária escura / texto escuro
  vibrantAccent: '#9FD1D4',   // Acento/vibração (botões de ação após preenchimento, badges, alertas positivos)
  dangerRed: '#DC2626',       // Vermelho para lixeira e ações destrutivas (mantido)
  danger: '#DC2626',          // Alias para ações de exclusão / alerta
  white: '#FFFFFF',
  mutedText: '#526D7E',       // Texto secundário sobre fundos claros: 5:1 (o secondaryMedium dá 3:1)
};

export type AppThemeName = 'claro' | 'escuro' | 'petroleo-digital' | 'obsidian-dark' | 'verde-floresta';

export type AppThemeColors = {
  // Cores da paleta oficial
  primaryDark: string;
  secondaryMedium: string;
  secondaryLight: string;
  lightBg: string;
  vibrantAccent: string;
  dangerRed: string;

  // Tokens de interface
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

export const themes: Record<string, AppThemeColors> = {
  claro: {
    primaryDark: PALETTE.primaryDark,
    secondaryMedium: PALETTE.secondaryMedium,
    secondaryLight: PALETTE.secondaryLight,
    lightBg: PALETTE.lightBg,
    vibrantAccent: PALETTE.vibrantAccent,
    dangerRed: PALETTE.dangerRed,

    background: '#F4F7F9',
    surface: '#FFFFFF',
    headerBackground: PALETTE.primaryDark,
    card: '#FFFFFF',
    cardBorder: PALETTE.lightBg,
    accent: PALETTE.primaryDark,
    accentSoft: PALETTE.lightBg,
    warmAccent: PALETTE.vibrantAccent,
    buttonBackground: PALETTE.primaryDark,
    buttonText: '#FFFFFF',
    inputBackground: '#FFFFFF',
    inputBorder: PALETTE.secondaryMedium,
    textPrimary: PALETTE.primaryDark,
    // Contraste AA (4,5:1) sobre os fundos claros; o secondaryMedium da paleta dava 2,8:1.
    textMuted: '#526D7E',
    divider: PALETTE.lightBg,
    // dangerRed dava 4,49:1 sobre o fundo; este tom do mesmo vermelho passa de 6:1.
    error: '#B91C1C',
    dockBackground: PALETTE.primaryDark,
    dockActive: PALETTE.secondaryLight,
    glowA: PALETTE.secondaryLight,
    glowB: PALETTE.primaryDark,
  },
  escuro: {
    primaryDark: PALETTE.primaryDark,
    secondaryMedium: PALETTE.secondaryMedium,
    secondaryLight: PALETTE.secondaryLight,
    lightBg: PALETTE.lightBg,
    vibrantAccent: PALETTE.vibrantAccent,
    dangerRed: PALETTE.dangerRed,

    background: '#1A2933',
    surface: PALETTE.primaryDark,
    headerBackground: '#1E2F3A',
    card: PALETTE.primaryDark,
    cardBorder: '#3D5A6E',
    // Acento da paleta: 6,3:1 sobre os cards (o secondaryLight dava 3,9:1).
    accent: PALETTE.vibrantAccent,
    accentSoft: '#223847',
    warmAccent: PALETTE.vibrantAccent,
    buttonBackground: PALETTE.secondaryLight,
    // Texto quase preto: 6,1:1 sobre o botão (o primaryDark dava 3,9:1).
    buttonText: '#10212B',
    inputBackground: '#1E2F3A',
    inputBorder: PALETTE.secondaryMedium,
    textPrimary: '#FFFFFF',
    textMuted: PALETTE.lightBg,
    divider: '#3D5A6E',
    // Vermelho claro para fundo escuro: 5,5:1 (o dangerRed dava 2,2:1).
    error: '#FCA5A5',
    dockBackground: '#1E2F3A',
    dockActive: PALETTE.vibrantAccent,
    glowA: PALETTE.vibrantAccent,
    glowB: PALETTE.primaryDark,
  },
};

// Aliases para retrocompatibilidade
themes['petroleo-digital'] = themes.claro;
themes['obsidian-dark'] = themes.escuro;
themes['verde-floresta'] = themes.claro;

export const themeLabel: Record<string, string> = {
  claro: 'Claro (Padrão Oficial)',
  escuro: 'Escuro',
};
