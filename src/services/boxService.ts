import type { Box } from '../types/box';
import { 
  getLocalBoxes, 
  setBoxArchivedLocal, 
  saveLocalBox, 
  deleteLocalBox,
  getLocalBoxById
} from './localDbService';
import { triggerSyncBackground } from './syncService';
import { normalizeBoxName } from '../utils/boxNameNormalizer';

export async function archiveBox(boxId: number): Promise<void> {
  await setBoxArchivedLocal(boxId, true);
  triggerSyncBackground();
}

export async function unarchiveBox(boxId: number): Promise<void> {
  await setBoxArchivedLocal(boxId, false);
  triggerSyncBackground();
}

export async function listRegisteredBoxes(params?: { apiaryId?: number; search?: string; includeArchived?: boolean; showAll?: boolean }): Promise<Box[]> {
  const rows = await getLocalBoxes(params);
  return rows.map((r) => ({
    id: r.id,
    apiaryId: r.apiary_id,
    apiaryName: r.apiary_name || '',
    name: r.name,
    position: r.position,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    archived: !!r.archived,
    role: r.apiary_role || 'owner',
  }));
}

export async function renameRegisteredBox(boxId: number, name: string): Promise<void> {
  const normalized = name.trim();

  if (normalized.length < 2) {
    throw new Error('Informe um nome valido para a caixa.');
  }

  const box = await getLocalBoxById(boxId);
  if (!box) throw new Error('Caixa não encontrada.');

  await saveLocalBox({
    id: boxId,
    apiaryId: box.apiary_id,
    name: normalizeBoxName(normalized),
    position: box.position,
    archived: box.archived,
  });

  triggerSyncBackground();
}

export async function deleteRegisteredBox(boxId: number): Promise<void> {
  await deleteLocalBox(boxId);
  triggerSyncBackground();
}
