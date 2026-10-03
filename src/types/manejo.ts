export type ManejoTask = {
  id: string;
  obs: string;
  ind: string;
  customName?: string;
};

export type ManejoReport = {
  id: number;
  clientUuid?: string;
  caixaId: number;
  caixaName: string;
  apiaryId: number | null;
  apiaryName: string;
  tipo: 'apiario';
  revisaoId?: number;
  checkedOptions: ManejoTask[];
  observacoes: string;
  indicacoes: string;
  photoUri?: string;
  createdAt: string;
  archived?: boolean;
};

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
  'trocar-caixa': 'Trocar caixa',
  outro: 'Outro',
};
