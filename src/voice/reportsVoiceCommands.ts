/**
 * Comandos de voz da tela de relatórios.
 *
 * As regras são testadas na ordem abaixo e a primeira que casa vence. Os
 * gatilhos são procurados como trecho do texto (includes), não como palavra
 * inteira: "manejo" também casa com "manejos" (mas "revisao" não casa com "revisoes").
 */
import type { ReportsFilter } from '../types/reports';
import { normalizeText } from './voiceText';

export type ReportsQuickFilter = 'all' | '7days' | 'thisMonth' | 'apiary' | 'box';

export type ReportsVoiceAction =
  | { type: 'scrollEditorToNotes' }
  | { type: 'closeEditors' }
  | { type: 'setFilter'; filter: ReportsFilter }
  | { type: 'reload' }
  | { type: 'setLastDays'; days: number }
  | { type: 'setQuickFilter'; quickFilter: ReportsQuickFilter }
  | { type: 'setSearch'; term: string };

const hasAny = (command: string, phrases: string[]) => phrases.some((phrase) => command.includes(phrase));

/** Traduz o texto falado numa ação da tela, ou `null` se não for um comando dela. */
export function parseReportsVoiceCommand(transcript: string): ReportsVoiceAction | null {
  const command = normalizeText(transcript);
  if (!command) return null;

  // Edição aberta e atualização.
  if (hasAny(command, ['observacoes', 'o que fazer'])) return { type: 'scrollEditorToNotes' };
  if (command.includes('encerrar')) return { type: 'closeEditors' };
  if (hasAny(command, ['filtro revisao', 'mostrar revisoes'])) return { type: 'setFilter', filter: 'revisoes' };
  if (hasAny(command, ['filtro manejo', 'mostrar manejos'])) return { type: 'setFilter', filter: 'manejos' };
  if (hasAny(command, ['atualizar dados', 'recarregar relatorios'])) return { type: 'reload' };
  if (command.includes('ultimos 7 dias')) return { type: 'setLastDays', days: 7 };
  if (hasAny(command, ['ultimos 30 dias', 'ultimo mes'])) return { type: 'setLastDays', days: 30 };

  // Tipo de relatório.
  if (hasAny(command, ['revisao', 'revisoes'])) return { type: 'setFilter', filter: 'revisoes' };
  if (command.includes('manejo')) return { type: 'setFilter', filter: 'manejos' };
  if (command.includes('apiario')) return { type: 'setFilter', filter: 'apiarios' };
  if (command.includes('caixa')) return { type: 'setFilter', filter: 'caixas' };

  // Períodos rápidos.
  if (hasAny(command, ['7 dias', 'sete dias', 'ultima semana'])) return { type: 'setQuickFilter', quickFilter: '7days' };
  if (hasAny(command, ['este mes', 'mes atual', '30 dias', 'trinta dias'])) return { type: 'setQuickFilter', quickFilter: 'thisMonth' };
  if (hasAny(command, ['todo periodo', 'todas as datas', 'todo o tempo'])) return { type: 'setQuickFilter', quickFilter: 'all' };

  // Busca.
  if (['limpar busca', 'limpar pesquisa', 'limpar filtro'].includes(command)) return { type: 'setSearch', term: '' };
  if (/^(buscar|pesquisar|filtrar por) /.test(command)) {
    const term = command.replace(/^(buscar|pesquisar|filtrar por)\s+/, '').trim();
    if (term) return { type: 'setSearch', term };
  }

  return null;
}
