import type { Box } from '../types/box';
import { 
  getLocalBoxes, 
  setBoxArchivedLocal, 
  saveLocalBox, 
  deleteLocalBox,
  getLocalBoxById,
  getLocalApiaryById,
  saveLocalApiary
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

export async function createRegisteredBox(params: {
  apiaryId: number;
  name: string;
}): Promise<Box> {
  const normalized = params.name.trim();

  if (normalized.length < 2) {
    throw new Error('Informe um nome válido para a caixa.');
  }

  const existingBoxes = await getLocalBoxes({ apiaryId: params.apiaryId, showAll: true });
  const maxPos = existingBoxes.reduce((max, b) => Math.max(max, b.position || 0), 0);
  const position = maxPos + 1;

  const row = await saveLocalBox({
    apiaryId: params.apiaryId,
    name: normalizeBoxName(normalized),
    position,
  });

  // Atualiza a contagem de caixas do apiário localmente
  const apiary = await getLocalApiaryById(params.apiaryId);
  if (apiary) {
    const newCount = Math.max(apiary.box_count, existingBoxes.length + 1);
    await saveLocalApiary({
      id: params.apiaryId,
      name: apiary.name,
      location: apiary.location,
      boxCount: newCount,
      description: apiary.description,
    });
  }

  triggerSyncBackground();

  return {
    id: row.id,
    apiaryId: row.apiary_id,
    apiaryName: apiary?.name || '',
    name: row.name,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archived: false,
    role: 'owner',
  };
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
  const box = await getLocalBoxById(boxId);
  await deleteLocalBox(boxId);

  if (box && box.apiary_id) {
    const apiary = await getLocalApiaryById(box.apiary_id);
    if (apiary) {
      const remaining = await getLocalBoxes({ apiaryId: box.apiary_id, showAll: true });
      await saveLocalApiary({
        id: box.apiary_id,
        name: apiary.name,
        location: apiary.location,
        boxCount: remaining.length,
        description: apiary.description,
      });
    }
  }

  triggerSyncBackground();
}
