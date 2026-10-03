import type { ManejoReport, ManejoTask } from '../types/manejo';
import { 
  getLocalManejos, 
  saveLocalManejo, 
  deleteLocalManejo, 
  setManejoArchivedLocal 
} from './localDbService';
import { triggerSyncBackground } from './syncService';

export async function saveManejoService(params: {
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
}): Promise<void> {
  await saveLocalManejo(params);
  triggerSyncBackground();
}

export async function listManejoReports(params?: {
  tipo?: 'apiario';
  apiaryId?: number;
  caixaId?: number;
  includeArchived?: boolean;
  fromDate?: string;
  toDate?: string;
}): Promise<ManejoReport[]> {
  const rows = await getLocalManejos(params);
  return rows.map((r) => ({
    id: r.id,
    caixaId: r.caixaId,
    caixaName: r.caixaName,
    apiaryId: r.apiaryId,
    apiaryName: r.apiaryName,
    tipo: r.tipo,
    revisaoId: r.revisaoId,
    checkedOptions: r.checkedOptions,
    observacoes: r.observacoes,
    indicacoes: r.indicacoes,
    photoUri: r.photoUri,
    createdAt: r.createdAt,
    archived: !!r.archived,
  }));
}

export async function deleteManejoService(id: number): Promise<void> {
  await deleteLocalManejo(id);
  triggerSyncBackground();
}

export async function updateManejoService(id: number, params: {
  checkedOptions: ManejoTask[];
  observacoes: string;
  indicacoes: string;
  photoUri?: string;
}): Promise<void> {
  const rows = await getLocalManejos({ includeArchived: true });
  const man = rows.find((r) => r.id === id);
  if (!man) throw new Error('Manejo não encontrado.');

  await saveLocalManejo({
    id,
    caixaId: man.caixaId,
    caixaName: man.caixaName,
    apiaryId: man.apiaryId,
    apiaryName: man.apiaryName,
    tipo: man.tipo,
    revisaoId: man.revisaoId,
    checkedOptions: params.checkedOptions,
    observacoes: params.observacoes,
    indicacoes: params.indicacoes,
    photoUri: params.photoUri,
  });

  triggerSyncBackground();
}

export async function archiveManejo(id: number): Promise<void> {
  await setManejoArchivedLocal(id, true);
  triggerSyncBackground();
}

export async function unarchiveManejo(id: number): Promise<void> {
  await setManejoArchivedLocal(id, false);
  triggerSyncBackground();
}
