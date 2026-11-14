/**
 * @jest-environment node
 */
/**
 * Contraste WCAG 2.1 AA dos temas (F6). O app é usado no campo, muitas vezes
 * ao sol: texto precisa de pelo menos 4,5:1 com o fundo, e ícones ou bordas
 * de controles, 3:1.
 */
import { contrastRatio } from '../../src/theme/contrast';
import { themes, type AppThemeColors } from '../../src/theme/themes';

type Pair = [foreground: keyof AppThemeColors, background: keyof AppThemeColors, minimum: number];

const TEXT = 4.5;
const NON_TEXT = 3;

/** Combinações usadas nas telas (cor do texto ou ícone sobre a cor do fundo). */
const PAIRS: Pair[] = [
  ['textPrimary', 'background', TEXT],
  ['textPrimary', 'surface', TEXT],
  ['textPrimary', 'card', TEXT],
  ['textPrimary', 'inputBackground', TEXT],
  ['textMuted', 'background', TEXT],
  ['textMuted', 'surface', TEXT],
  ['textMuted', 'card', TEXT],
  ['textMuted', 'inputBackground', TEXT],
  ['accent', 'card', TEXT],
  ['accent', 'background', TEXT],
  ['buttonText', 'buttonBackground', TEXT],
  ['error', 'card', TEXT],
  ['error', 'background', TEXT],
  ['inputBorder', 'inputBackground', NON_TEXT],
  ['dockActive', 'dockBackground', NON_TEXT],
];

describe('contrastRatio', () => {
  it('preto sobre branco é 21:1 e cor igual é 1:1', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
    expect(contrastRatio('#2C4251', '#2C4251')).toBeCloseTo(1, 5);
  });
});

describe.each(['claro', 'escuro'])('tema %s', (name) => {
  const theme = themes[name];

  it.each(PAIRS)('%s sobre %s atinge %d:1', (foreground, background, minimum) => {
    expect(contrastRatio(theme[foreground], theme[background])).toBeGreaterThanOrEqual(minimum);
  });
});
