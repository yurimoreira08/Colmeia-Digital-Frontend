export type ReviewReport = {
  id: number;
  clientUuid?: string;
  caixaId: number;
  caixaName: string;
  apiaryId: number | null;
  apiaryName: string;
  tipo: 'apiario';
  checkedOptions: string[];
  observacoes: string;
  indicacoes: string;
  createdAt: string;
  archived?: boolean;
};

export const OPTION_LABELS: Record<string, string> = {
  nucleo: 'Núcleo',
  caixa: 'Caixa',
  rainha: 'Rainha',
  polen: 'Pólen',
  mel: 'Mel',
  'cria-nova-3-dias': 'Cria Nova 3 dias',
  'cria-aberta': 'Cria Aberta',
  'cria-fechada': 'Cria Fechada',
  ovos: 'Ovos',
  'com-espaco': 'Com espaço',
  'sem-espaco': 'Sem espaço',
  'forca-fraca': 'Força - Fraca',
  'forca-media': 'Força - Média',
  'forca-boa': 'Força - Boa',
  'com-enxame': 'Enxame',
  'sem-enxame': 'Sem enxame',
};
