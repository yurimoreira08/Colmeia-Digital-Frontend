/**
 * Regras dos itens da revisão e tratamento do texto falado.
 */
import { applyOptionSelection, checkedOptionIds } from '../../src/utils/revisionOptions';
import { appendSentence, containsWholeWord, formatDictation, normalizeText } from '../../src/voice/voiceText';

describe('applyOptionSelection', () => {
  it('marcar um item do grupo desmarca os outros', () => {
    expect(applyOptionSelection({ 'forca-fraca': true, 'forca-media': false }, 'forca-boa', true))
      .toEqual({ 'forca-fraca': false, 'forca-media': false, 'forca-boa': true });
    expect(applyOptionSelection({ caixa: true }, 'nucleo', true)).toEqual({ caixa: false, nucleo: true });
  });

  it('ovos implica rainha', () => {
    expect(applyOptionSelection({}, 'ovos', true)).toEqual({ ovos: true, rainha: true });
  });

  it('desmarcar não mexe nos outros itens', () => {
    expect(applyOptionSelection({ ovos: true, rainha: true }, 'ovos', false)).toEqual({ ovos: false, rainha: true });
  });

  it('não altera o objeto recebido', () => {
    const selection = { caixa: true };
    applyOptionSelection(selection, 'nucleo', true);
    expect(selection).toEqual({ caixa: true });
  });

  it('checkedOptionIds devolve só os marcados', () => {
    expect(checkedOptionIds({ mel: true, polen: false, ovos: true })).toEqual(['mel', 'ovos']);
  });
});

describe('texto falado', () => {
  it('normalizeText tira acentos, pontuação e espaços extras', () => {
    expect(normalizeText('  Observação:  Pólen,  MÉDIA! ')).toBe('observacao polen media');
  });

  it('containsWholeWord só aceita a palavra inteira', () => {
    expect(containsWholeWord('tem mel na caixa', 'mel')).toBe(true);
    expect(containsWholeWord('colocar melgueira', 'mel')).toBe(false);
    expect(containsWholeWord('cria nova 3 dias', 'cria nova')).toBe(true);
  });

  it('formatDictation tira a palavra de ligação e põe maiúscula', () => {
    expect(formatDictation('que enxame calmo')).toBe('Enxame calmo');
    expect(formatDictation('de')).toBe('De');
    expect(formatDictation('')).toBe('');
  });

  it('appendSentence separa as frases com ponto', () => {
    expect(appendSentence('', 'Enxame calmo')).toBe('Enxame calmo');
    expect(appendSentence('Enxame calmo.', 'Rainha ativa')).toBe('Enxame calmo. Rainha ativa');
  });
});
