import { Alert } from 'react-native';
import { apiRequest } from './apiClient';
import type { Apiary } from '../types/apiary';
import { 
  getLocalApiaries, 
  getLocalApiaryById, 
  saveLocalApiary, 
  deleteLocalApiary,
  getLocalBoxes,
  saveLocalBox,
  deleteLocalBox,
  getLocalDb
} from './localDbService';
import { triggerSyncBackground } from './syncService';
import { normalizeBoxName } from '../utils/boxNameNormalizer';

function parseBoxCount(value: string): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
    throw new Error('Informe uma quantidade de caixas valida.');
  }

  return parsed;
}

function assertRequired(value: string, fieldLabel: string): void {
  if (!value || value.trim().length < 2) {
    throw new Error(`Informe ${fieldLabel}.`);
  }
}

async function syncLocalApiaryBoxes(apiaryId: number, boxCount: number): Promise<void> {
  const existingBoxes = await getLocalBoxes({ apiaryId, showAll: true });
  const currentCount = existingBoxes.length;

  if (currentCount < boxCount) {
    const existingNames = new Set(existingBoxes.map(b => b.name.toLowerCase().trim()));
    let nextNum = currentCount + 1;

    for (let i = currentCount + 1; i <= boxCount; i++) {
      let candidateName = normalizeBoxName(`Nova Caixa ${nextNum}`);
      while (existingNames.has(candidateName.toLowerCase().trim())) {
        nextNum++;
        candidateName = normalizeBoxName(`Nova Caixa ${nextNum}`);
      }
      existingNames.add(candidateName.toLowerCase().trim());

      await saveLocalBox({
        apiaryId,
        name: candidateName,
        position: i,
      });
      nextNum++;
    }
  } else if (currentCount > boxCount) {
    const toDelete = existingBoxes.slice(boxCount);
    for (const box of toDelete) {
      await deleteLocalBox(box.id);
    }
  }
}

export async function listAllApiaries(): Promise<Apiary[]> {
  const rows = await getLocalApiaries();
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    location: r.location,
    boxCount: r.box_count,
    description: r.description,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    role: r.role,
  }));
}

export async function loadApiary(id: number): Promise<Apiary | null> {
  const r = await getLocalApiaryById(id);
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    location: r.location,
    boxCount: r.box_count,
    description: r.description,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    role: r.role,
  };
}

export async function saveApiary(params: {
  id?: number;
  name: string;
  location: string;
  boxCount: string;
  description: string;
}): Promise<Apiary> {
  assertRequired(params.name, 'o nome do apiario');
  assertRequired(params.location, 'o local do apiario');
  assertRequired(params.description, 'a descricao do apiario');

  const parsedBoxCount = parseBoxCount(params.boxCount);

  if (params.id) {
    const existingBoxes = await getLocalBoxes({ apiaryId: params.id, showAll: true });
    if (parsedBoxCount < existingBoxes.length) {
      Alert.alert(
        'Aviso',
        'Não é possível reduzir a quantidade automaticamente para evitar a perda de dados no servidor. Exclua a caixa individualmente se ela estiver realmente vazia.'
      );
      throw new Error('Não é possível reduzir a quantidade de caixas automaticamente.');
    }
  }

  const apiaryRow = await saveLocalApiary({
    id: params.id,
    name: params.name,
    location: params.location,
    boxCount: parsedBoxCount,
    description: params.description,
  });

  // Sincronizar as caixas localmente para que apareçam offline imediatamente
  await syncLocalApiaryBoxes(apiaryRow.id, parsedBoxCount);

  triggerSyncBackground();

  return {
    id: apiaryRow.id,
    name: apiaryRow.name,
    location: apiaryRow.location,
    boxCount: apiaryRow.box_count,
    description: apiaryRow.description,
    createdAt: apiaryRow.created_at,
    updatedAt: apiaryRow.updated_at,
  };
}

export async function removeApiary(id: number): Promise<void> {
  await deleteLocalApiary(id);
  triggerSyncBackground();
}
