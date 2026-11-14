/**
 * Cálculos da tela de relatórios: busca nos registros e métricas do período
 * (crescimento, locais mais comuns e barras por semana). Funções puras, sem
 * acesso ao banco.
 */
import type { ReportsStatsResponse } from '../services/reportsService';
import type { Box } from '../types/box';
import type { ReportsFilter } from '../types/reports';

/** Nome de cada tarefa de manejo, usado na busca e na edição. */
export const MANEJO_OPTION_LABELS: Record<string, string> = {
  alimentacao: 'Alimentação',
  divisao: 'Divisão',
  'troca-cera': 'Troca de cera',
  'troca-rainha': 'Troca de rainha',
  'colocacao-sobrecaixa': 'Colocação de sobrecaixa',
  captura: 'Captura',
  'defesa-predadores': 'Defesa contra predadores',
  'reducao-alvado': 'Redução de alvado',
  'numerar-caixas': 'Numerar caixas',
  'ofertar-agua': 'Ofertar água',
  'recolher-caixas-vazias': 'Recolher caixas vazias ou abandonadas',
  'trocar-caixa': 'Caixa trocada',
  outro: 'Outro',
};

/** Data no formato AAAA-MM-DD (UTC). */
export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export type DateWindow = { fromIso: string; toIso: string };

type TextFields = { apiaryName?: string; caixaName?: string; observacoes?: string; indicacoes?: string };
type ManejoTaskLike = { id: string; obs?: string; ind?: string };

const includesTerm = (value: string | undefined, term: string) => (value || '').toLowerCase().includes(term);

/** A revisão contém o termo (já em minúsculas) no apiário, na caixa ou nas anotações. Termo vazio aceita tudo. */
export function matchesRevisionSearch(item: TextFields, term: string): boolean {
  if (!term) return true;
  return includesTerm(item.apiaryName, term) || includesTerm(item.caixaName, term) || includesTerm(item.observacoes, term) || includesTerm(item.indicacoes, term);
}

/** Como matchesRevisionSearch, procurando também no nome e nas anotações de cada tarefa. */
export function matchesManejoSearch(item: TextFields & { checkedOptions?: ManejoTaskLike[] }, term: string): boolean {
  if (!term) return true;
  if (matchesRevisionSearch(item, term)) return true;
  return (item.checkedOptions || []).some((task) => {
    const label = MANEJO_OPTION_LABELS[task.id] || task.id;
    return includesTerm(label, term) || includesTerm(task.obs, term) || includesTerm(task.ind, term);
  });
}

/** Linha de caixa do SQLite convertida para o tipo usado na tela. */
export function toBox(row: any): Box {
  return {
    id: row.id,
    apiaryId: row.apiary_id,
    apiaryName: row.apiary_name || '',
    name: row.name,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archived: !!row.archived,
  };
}

/** Dias do período, contando o primeiro e o último (mínimo 1). */
export function periodLengthInDays({ fromIso, toIso }: DateWindow): number {
  const ms = new Date(toIso).getTime() - new Date(fromIso).getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
  return Number.isFinite(days) && days > 0 ? days : 1;
}

/** Variação percentual sobre a base; sem base, 100% se houve algum registro. */
export function growthPercent(current: number, baseline: number): number {
  if (baseline <= 0) return current > 0 ? 100 : 0;
  return Number((((current - baseline) / baseline) * 100).toFixed(1));
}

/** Os 5 locais com mais apiários. */
export function topApiaryLocations(apiaries: { location?: string | null }[]): { location: string; total: number }[] {
  const locationCount = new Map<string, number>();
  for (const apiary of apiaries) {
    const location = (apiary.location || '').trim() || 'Sem local definido';
    locationCount.set(location, (locationCount.get(location) ?? 0) + 1);
  }
  return [...locationCount.entries()]
    .map(([location, total]) => ({ location, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
}

/** Divide o período em 4 partes (S1–S4) e conta as datas (AAAA-MM-DD) de cada uma. */
export function weeklyBars({ fromIso, toIso }: DateWindow, dates: string[]): { label: string; value: number }[] {
  const start = new Date(fromIso);
  const end = new Date(toIso);
  const stepMs = Math.max(Math.floor((end.getTime() - start.getTime()) / 4), 1000 * 60 * 60 * 24);
  const boundaries = [0, 1, 2, 3].map((index) => new Date(start.getTime() + stepMs * (index + 1)));

  return ['S1', 'S2', 'S3', 'S4'].map((label, index) => {
    const upperBoundary = boundaries[index] ?? end;
    const value = dates.filter((iso) => {
      const date = new Date(iso);
      if (Number.isNaN(date.getTime())) return false;
      if (index === 0) return date >= start && date <= upperBoundary;
      return date > boundaries[index - 1] && date <= upperBoundary;
    }).length;
    return { label, value };
  });
}

/**
 * Métricas de crescimento dos filtros "apiários" e "caixas".
 *
 * A base do crescimento são os registros criados antes da metade do período.
 * Recebe os apiários e as caixas já filtrados pelo período.
 */
export function computeGrowthMetrics(params: {
  filter: ReportsFilter;
  window: DateWindow;
  apiaries: { created_at: string; location?: string | null }[];
  boxes: { created_at: string }[];
  revisions: { createdAt: string }[];
  manejos: { createdAt: string }[];
}): NonNullable<ReportsStatsResponse['metrics']> {
  const { filter, window, apiaries, boxes, revisions, manejos } = params;
  const periodDays = periodLengthInDays(window);
  const midpoint = Math.ceil(periodDays / 2);
  const baseline = (items: unknown[]) => Math.max(items.length - midpoint, 0);

  const datesByFilter: Record<ReportsFilter, string[]> = {
    apiarios: apiaries.map((item) => item.created_at.slice(0, 10)),
    caixas: boxes.map((item) => item.created_at.slice(0, 10)),
    revisoes: revisions.map((item) => item.createdAt.slice(0, 10)),
    manejos: manejos.map((item) => item.createdAt.slice(0, 10)),
  };

  return {
    periodDays,
    totalApiaries: apiaries.length,
    totalBoxes: boxes.length,
    apiaryGrowthPercent: growthPercent(apiaries.length, baseline(apiaries)),
    boxGrowthPercent: growthPercent(boxes.length, baseline(boxes)),
    topLocations: topApiaryLocations(apiaries),
    barsData: weeklyBars(window, datesByFilter[filter] ?? []),
  };
}

/** A data (AAAA-MM-DD ou ISO completo) está dentro do período. */
export function isInDateWindow(value: string, { fromIso, toIso }: DateWindow): boolean {
  const day = value.includes('T') ? value.slice(0, 10) : value;
  return day >= fromIso && day <= toIso;
}
