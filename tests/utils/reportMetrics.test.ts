/**
 * Cálculos dos relatórios e comandos de voz da tela de relatórios.
 */
import {
  computeGrowthMetrics,
  growthPercent,
  isInDateWindow,
  matchesManejoSearch,
  matchesRevisionSearch,
  periodLengthInDays,
  topApiaryLocations,
  weeklyBars,
} from '../../src/utils/reportMetrics';
import { parseReportsVoiceCommand } from '../../src/voice/reportsVoiceCommands';

const window = { fromIso: '2026-06-01', toIso: '2026-06-28' };

describe('período', () => {
  it('conta o primeiro e o último dia, com mínimo de 1', () => {
    expect(periodLengthInDays(window)).toBe(28);
    expect(periodLengthInDays({ fromIso: '2026-06-10', toIso: '2026-06-01' })).toBe(1);
  });

  it('aceita data simples ou ISO completo', () => {
    expect(isInDateWindow('2026-06-28T23:59:00.000Z', window)).toBe(true);
    expect(isInDateWindow('2026-05-31', window)).toBe(false);
  });
});

describe('crescimento', () => {
  it('sem base: 100% se houve registro, 0% se não', () => {
    expect(growthPercent(3, 0)).toBe(100);
    expect(growthPercent(0, 0)).toBe(0);
  });

  it('com base: variação com uma casa decimal', () => {
    expect(growthPercent(4, 3)).toBe(33.3);
  });
});

describe('locais e barras', () => {
  it('top 5 locais; sem local vira "Sem local definido"', () => {
    expect(topApiaryLocations([{ location: 'Picos' }, { location: ' ' }, { location: 'Picos' }])).toEqual([
      { location: 'Picos', total: 2 },
      { location: 'Sem local definido', total: 1 },
    ]);
  });

  it('distribui as datas em 4 partes do período', () => {
    // 27 dias / 4: as divisas caem em 07/06 18h, 14/06 12h, 21/06 6h e 28/06.
    expect(weeklyBars(window, ['2026-06-01', '2026-06-08', '2026-06-09', '2026-06-28', 'data inválida'])).toEqual([
      { label: 'S1', value: 1 },
      { label: 'S2', value: 2 },
      { label: 'S3', value: 0 },
      { label: 'S4', value: 1 },
    ]);
  });

  it('as barras seguem o filtro escolhido', () => {
    const metrics = computeGrowthMetrics({
      filter: 'caixas',
      window,
      apiaries: [{ created_at: '2026-06-02T10:00:00Z', location: 'Picos' }],
      boxes: [{ created_at: '2026-06-27T10:00:00Z' }, { created_at: '2026-06-28T10:00:00Z' }],
      revisions: [],
      manejos: [],
    });
    expect(metrics).toMatchObject({ periodDays: 28, totalApiaries: 1, totalBoxes: 2, apiaryGrowthPercent: 100, boxGrowthPercent: 100 });
    expect(metrics.barsData.map((bar) => bar.value)).toEqual([0, 0, 0, 2]);
  });
});

describe('busca', () => {
  const revision = { apiaryName: 'Apiário Sol', caixaName: 'Caixa 01', observacoes: 'Mel escuro', indicacoes: '' };

  it('procura em apiário, caixa e anotações', () => {
    expect(matchesRevisionSearch(revision, 'mel')).toBe(true);
    expect(matchesRevisionSearch(revision, 'rainha')).toBe(false);
    expect(matchesRevisionSearch(revision, '')).toBe(true);
  });

  it('no manejo, procura também no nome e nas anotações das tarefas', () => {
    const manejo = { ...revision, checkedOptions: [{ id: 'troca-rainha', obs: '', ind: 'comprar rainha' }] };
    expect(matchesManejoSearch(manejo, 'troca de')).toBe(true);
    expect(matchesManejoSearch(manejo, 'comprar')).toBe(true);
    expect(matchesManejoSearch(manejo, 'divisão')).toBe(false);
  });
});

describe('parseReportsVoiceCommand', () => {
  it.each([
    ['Mostrar revisões', { type: 'setFilter', filter: 'revisoes' }],
    ['revisão', { type: 'setFilter', filter: 'revisoes' }],
    ['manejos', { type: 'setFilter', filter: 'manejos' }],
    ['apiários', { type: 'setFilter', filter: 'apiarios' }],
    ['caixas', { type: 'setFilter', filter: 'caixas' }],
    ['últimos 7 dias', { type: 'setLastDays', days: 7 }],
    ['último mês', { type: 'setLastDays', days: 30 }],
    ['sete dias', { type: 'setQuickFilter', quickFilter: '7days' }],
    ['este mês', { type: 'setQuickFilter', quickFilter: 'thisMonth' }],
    ['todo o tempo', { type: 'setQuickFilter', quickFilter: 'all' }],
    ['buscar rainha nova', { type: 'setSearch', term: 'rainha nova' }],
    ['limpar busca', { type: 'setSearch', term: '' }],
    ['atualizar dados', { type: 'reload' }],
    ['encerrar', { type: 'closeEditors' }],
    ['observações', { type: 'scrollEditorToNotes' }],
  ])('"%s"', (spoken, action) => {
    expect(parseReportsVoiceCommand(spoken)).toEqual(action);
  });

  it('frases sem comando e silêncio', () => {
    expect(parseReportsVoiceCommand('bom dia')).toBeNull();
    expect(parseReportsVoiceCommand('  ')).toBeNull();
  });
});
