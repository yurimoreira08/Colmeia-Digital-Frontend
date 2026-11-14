/**
 * Itens marcáveis da revisão da caixa e as regras entre eles.
 *
 * Os ids são gravados em `checked_options` e enviados ao backend: não mude
 * um id existente.
 */

export type RevisionOption = { id: string; label: string };

/** Marcação atual: id do item → marcado. */
export type RevisionSelection = Record<string, boolean>;

/** Seções da tela, na ordem em que aparecem. */
export const TYPE_AND_SPACE_OPTIONS: RevisionOption[] = [
  { id: 'nucleo', label: 'Núcleo' },
  { id: 'caixa', label: 'Caixa' },
  { id: 'com-espaco', label: 'Com Espaço' },
  { id: 'sem-espaco', label: 'Sem Espaço' },
];

export const QUEEN_BROOD_FOOD_OPTIONS: RevisionOption[] = [
  { id: 'rainha', label: 'Rainha' },
  { id: 'ovos', label: 'Ovos' },
  { id: 'cria-nova-3-dias', label: 'Cria Nova' },
  { id: 'cria-aberta', label: 'Cria Aberta' },
  { id: 'cria-fechada', label: 'Cria Fechada' },
  { id: 'mel', label: 'Mel' },
  { id: 'polen', label: 'Pólen' },
];

export const STRENGTH_OPTIONS: RevisionOption[] = [
  { id: 'forca-fraca', label: 'Fraca' },
  { id: 'forca-media', label: 'Média' },
  { id: 'forca-boa', label: 'Boa' },
];

/** Itens que a voz reconhece, na ordem de busca no texto falado. */
export const VOICE_OPTIONS: RevisionOption[] = [
  { id: 'nucleo', label: 'Nucleo' },
  { id: 'caixa', label: 'Caixa' },
  { id: 'rainha', label: 'Rainha' },
  { id: 'polen', label: 'Polen' },
  { id: 'mel', label: 'Mel' },
  { id: 'cria-nova-3-dias', label: 'Cria Nova\n3 dias' },
  { id: 'cria-aberta', label: 'Cria Aberta' },
  { id: 'cria-fechada', label: 'Cria Fechada' },
  { id: 'ovos', label: 'Ovos' },
  { id: 'com-espaco', label: 'Com espaco' },
  { id: 'sem-espaco', label: 'Sem espaco' },
  { id: 'forca-fraca', label: 'Força - Fraca' },
  { id: 'forca-media', label: 'Força - Média' },
  { id: 'forca-boa', label: 'Força - Boa' },
];

/** Formas faladas de cada item (comparadas depois de normalizeText). */
export const VOICE_OPTION_ALIASES: Record<string, string[]> = {
  nucleo: ['nucleo'],
  caixa: ['caixa'],
  rainha: ['rainha'],
  polen: ['polen', 'polém', 'polem', 'pollen'],
  mel: ['mel'],
  'cria-nova-3-dias': ['cria nova', 'cria nova 3 dias', 'cria de 3 dias'],
  'cria-aberta': ['cria aberta'],
  'cria-fechada': ['cria fechada'],
  ovos: ['ovos', 'ovo'],
  'com-espaco': ['com espaco', 'tem espaco', 'com espaço'],
  'sem-espaco': ['sem espaco', 'sem espaço'],
  'forca-fraca': ['fraca'],
  'forca-media': ['media', 'média'],
  'forca-boa': ['boa'],
  'com-enxame': ['com enxame', 'enxame'],
  'sem-enxame': ['sem enxame'],
};

/** Ao marcar a chave, desmarca os itens da lista (só um do grupo vale). */
const EXCLUSIVE_WITH: Record<string, string[]> = {
  caixa: ['nucleo'],
  nucleo: ['caixa'],
  'com-espaco': ['sem-espaco'],
  'sem-espaco': ['com-espaco'],
  'com-enxame': ['sem-enxame'],
  'sem-enxame': ['com-enxame'],
  'forca-fraca': ['forca-media', 'forca-boa'],
  'forca-media': ['forca-fraca', 'forca-boa'],
  'forca-boa': ['forca-fraca', 'forca-media'],
};

/** Ao marcar a chave, marca também estes itens (havendo ovos, há rainha). */
const IMPLIES: Record<string, string[]> = {
  ovos: ['rainha'],
};

/** Marca ou desmarca um item aplicando as regras de exclusão e de implicação. */
export function applyOptionSelection(selection: RevisionSelection, id: string, checked: boolean): RevisionSelection {
  const next = { ...selection, [id]: checked };
  if (checked) {
    for (const other of EXCLUSIVE_WITH[id] ?? []) next[other] = false;
    for (const other of IMPLIES[id] ?? []) next[other] = true;
  }
  return next;
}

/** Ids marcados, para gravar em `checked_options`. */
export function checkedOptionIds(selection: RevisionSelection): string[] {
  return Object.entries(selection)
    .filter(([, checked]) => checked)
    .map(([id]) => id);
}
