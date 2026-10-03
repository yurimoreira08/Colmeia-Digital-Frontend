import type { ReviewReport } from '../types/reviewReport';
import { 
  getLocalRevisions, 
  saveLocalRevision, 
  deleteLocalRevision, 
  setRevisionArchivedLocal 
} from './localDbService';
import { triggerSyncBackground } from './syncService';

export async function saveRevision(params: {
  caixaId: number;
  caixaName: string;
  apiaryId: number | null;
  apiaryName: string;
  tipo: 'apiario';
  checkedOptions: string[];
  observacoes: string;
  indicacoes: string;
}): Promise<void> {
  await saveLocalRevision(params);
  triggerSyncBackground();
}

export async function listRevisionReports(params?: {
  tipo?: 'apiario';
  apiaryId?: number;
  caixaId?: number;
  includeArchived?: boolean;
  fromDate?: string;
  toDate?: string;
}): Promise<ReviewReport[]> {
  const rows = await getLocalRevisions(params);
  return rows.map((r) => ({
    id: r.id,
    caixaId: r.caixaId,
    caixaName: r.caixaName,
    apiaryId: r.apiaryId,
    apiaryName: r.apiaryName,
    tipo: r.tipo,
    checkedOptions: r.checkedOptions,
    observacoes: r.observacoes,
    indicacoes: r.indicacoes,
    createdAt: r.createdAt,
    archived: !!r.archived,
  }));
}

export { listRevisionReports as listRevisions };

export async function deleteRevision(id: number): Promise<void> {
  await deleteLocalRevision(id);
  triggerSyncBackground();
}

export async function updateRevision(
  id: number,
  params: { observacoes: string; indicacoes: string; checkedOptions: string[] },
): Promise<void> {
  const rows = await getLocalRevisions({ includeArchived: true });
  const rev = rows.find((r) => r.id === id);
  if (!rev) throw new Error('Revisão não encontrada.');

  await saveLocalRevision({
    id,
    caixaId: rev.caixaId,
    caixaName: rev.caixaName,
    apiaryId: rev.apiaryId,
    apiaryName: rev.apiaryName,
    tipo: rev.tipo,
    checkedOptions: params.checkedOptions,
    observacoes: params.observacoes,
    indicacoes: params.indicacoes,
  });

  triggerSyncBackground();
}

export async function archiveRevision(id: number): Promise<void> {
  await setRevisionArchivedLocal(id, true);
  triggerSyncBackground();
}

export async function unarchiveRevision(id: number): Promise<void> {
  await setRevisionArchivedLocal(id, false);
  triggerSyncBackground();
}
