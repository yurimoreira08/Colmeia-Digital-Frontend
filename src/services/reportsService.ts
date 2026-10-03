import { getActiveBackendUrl, getAuthHeaders } from './apiClient';

export interface ReportsStatsParams {
  fromIso: string;
  toIso: string;
  searchTerm?: string;
  chartFilter: 'apiarios' | 'caixas' | 'revisoes' | 'manejos';
}

export interface ReportsStatsResponse {
  apiaries: any[];
  boxes: any[];
  revisions: any[];
  manejos: any[];
  metrics: {
    periodDays: number;
    totalApiaries: number;
    totalBoxes: number;
    apiaryGrowthPercent: number;
    boxGrowthPercent: number;
    topLocations: Array<{ location: string; total: number }>;
    barsData: Array<{ label: string; value: number }>;
  };
}

export async function fetchReportsStats(params: ReportsStatsParams): Promise<ReportsStatsResponse> {
  const baseUrl = await getActiveBackendUrl();
  const cleanBaseUrl = baseUrl.trim().replace(/\/api\/v1\/?$/, '');
  const response = await fetch(`${cleanBaseUrl}/api/v1/reports/stats`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(params),
  });

  const data = (await response.json()) as Partial<ReportsStatsResponse> & { message?: string };

  if (!response.ok) {
    throw new Error(data.message || 'Falha ao buscar estatísticas de relatórios.');
  }

  return data as ReportsStatsResponse;
}
