import { useCallback, useState, useEffect } from 'react';
import { Alert, Keyboard } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { listRegisteredBoxes, renameRegisteredBox, deleteRegisteredBox, archiveBox, createRegisteredBox } from '../services/boxService';
import { listRevisionReports, archiveRevision } from '../services/reviewReportService';
import { listManejoReports, archiveManejo } from '../services/manejoService';
import { loadApiary, listAllApiaries } from '../services/apiaryService';
import { useVoiceCommand } from '../voice/VoiceCommandContext';
import { APP_SESSION_START } from '../utils/session';
import {
  isBoxModifiedInSession,
  getBoxSessionModification,
  markBoxModifiedInSession,
  subscribeSessionModifications,
} from '../services/sessionStore';
import type { RootStackParamList } from '../types/auth';
import { useAppTheme } from '../theme/ThemeContext';
import { normalizeBoxName } from '../utils/boxNameNormalizer';

export type BoxItem = {
  id: string;
  rawId: number;
  type: 'box';
  name: string;
  apiaryName: string;
  apiaryId?: number;
  isHandled?: boolean;
  modificationType?: 'revisao' | 'manejo' | 'both' | null;
  sessionTimestamp?: number;
  role?: 'reader' | 'editor' | 'owner';
};

export type ApiaryBoxesSection = {
  apiaryId: number;
  apiaryName: string;
  role?: 'reader' | 'editor' | 'owner';
  lastModifiedTime: number;
  boxes: BoxItem[];
};

export function useBoxesList(navigation: any, routeParams: any) {
  const { colors } = useAppTheme();
  const { registerScreenCommandHandler } = useVoiceCommand();

  const [boxes, setBoxes] = useState<BoxItem[]>([]);
  const [apiarySections, setApiarySections] = useState<ApiaryBoxesSection[]>([]);
  const [search, setSearch] = useState('');
  const [renameVisible, setRenameVisible] = useState(false);
  const [selectedBoxForRename, setSelectedBoxForRename] = useState<BoxItem | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteBoxId, setDeleteBoxId] = useState<number | null>(null);
  const [archiveBoxId, setArchiveBoxId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modal para adicionar nova caixa
  const [addBoxVisible, setAddBoxVisible] = useState(false);
  const [newBoxName, setNewBoxName] = useState('');
  const [addingBox, setAddingBox] = useState(false);
  const [targetAddApiary, setTargetAddApiary] = useState<{ id: number; name: string } | null>(null);

  const [annotationsModalVisible, setAnnotationsModalVisible] = useState(false);
  const [selectedBoxForAnnotations, setSelectedBoxForAnnotations] = useState<BoxItem | null>(null);
  const [allRevisions, setAllRevisions] = useState<any[]>([]);
  const [allManejos, setAllManejos] = useState<any[]>([]);
  const [detailedAnnotation, setDetailedAnnotation] = useState<any | null>(null);

  const selectedApiaryId = routeParams?.apiaryId ? Number(routeParams.apiaryId) : undefined;
  const selectedApiaryName = routeParams?.apiaryName;
  const mode = routeParams?.mode;
  const [role, setRole] = useState<'reader' | 'editor' | 'owner'>('owner');

  const loadBoxes = useCallback(async (): Promise<void> => {
    const [allBoxes, revData, manData, apiariesList] = await Promise.all([
      listRegisteredBoxes(selectedApiaryId ? { apiaryId: selectedApiaryId, search } : { search }),
      listRevisionReports(),
      listManejoReports(),
      listAllApiaries(),
    ]);

    setAllRevisions(revData);
    setAllManejos(manData);

    const items: BoxItem[] = [];

    allBoxes.forEach((b) => {
      const sessionMod = getBoxSessionModification(b.id);
      const sessionRevDates = revData
        .filter((r) => r.caixaId === b.id && r.createdAt && r.createdAt >= APP_SESSION_START)
        .map((r) => (r.createdAt ? new Date(r.createdAt).getTime() : 0));
      const sessionManDates = manData
        .filter((m) => m.caixaId === b.id && m.createdAt && m.createdAt >= APP_SESSION_START)
        .map((m) => (m.createdAt ? new Date(m.createdAt).getTime() : 0));

      let sessionTimestamp = 0;
      if (sessionMod?.timestamp) {
        sessionTimestamp = sessionMod.timestamp;
      } else if (sessionRevDates.length > 0 || sessionManDates.length > 0) {
        sessionTimestamp = Math.max(0, ...sessionRevDates, ...sessionManDates);
      }

      const isHandled = sessionTimestamp > 0;

      let modType: 'revisao' | 'manejo' | 'both' | null = null;
      if (sessionMod) {
        modType = sessionMod.type;
      } else if (sessionRevDates.length > 0 && sessionManDates.length > 0) {
        modType = 'both';
      } else if (sessionManDates.length > 0) {
        modType = 'manejo';
      } else if (sessionRevDates.length > 0) {
        modType = 'revisao';
      }

      items.push({
        id: `box-${b.id}`,
        rawId: b.id,
        type: 'box',
        name: b.name,
        apiaryName: b.apiaryName,
        apiaryId: b.apiaryId,
        isHandled,
        modificationType: modType,
        sessionTimestamp,
        role: b.role,
      });
    });

    setBoxes(items);

    // Identificar apiários relevantes para agrupamento por seção
    const relevantApiaries: { id: number; name: string; role?: 'reader' | 'editor' | 'owner' }[] = [];

    if (selectedApiaryId) {
      const found = apiariesList.find((a) => a.id === selectedApiaryId);
      relevantApiaries.push({
        id: selectedApiaryId,
        name: found?.name || selectedApiaryName || 'Apiário',
        role: found?.role || role || 'owner',
      });
    } else {
      const seenIds = new Set<number>();
      apiariesList.forEach((a) => {
        seenIds.add(a.id);
        relevantApiaries.push({
          id: a.id,
          name: a.name,
          role: a.role || 'owner',
        });
      });

      items.forEach((box) => {
        if (box.apiaryId && !seenIds.has(box.apiaryId)) {
          seenIds.add(box.apiaryId);
          relevantApiaries.push({
            id: box.apiaryId,
            name: box.apiaryName || `Apiário ${box.apiaryId}`,
            role: 'owner',
          });
        }
      });
    }

    const sections: ApiaryBoxesSection[] = [];

    relevantApiaries.forEach((ap) => {
      const boxesInApiary = items.filter(
        (b) => b.apiaryId === ap.id || (b.apiaryName && b.apiaryName.trim().toLowerCase() === ap.name.trim().toLowerCase())
      );

      const lastModifiedTime = Math.max(0, ...boxesInApiary.map((b) => b.sessionTimestamp || 0));

      // Ordenar caixas dentro do apiário:
      // Mexidas recentemente na sessão primeiro (ordem decrescente de timestamp), depois ordem alfabética natural
      boxesInApiary.sort((a, b) => {
        const aTime = a.sessionTimestamp || 0;
        const bTime = b.sessionTimestamp || 0;

        if (aTime > 0 && bTime > 0) {
          if (bTime !== aTime) return bTime - aTime;
          return a.name.localeCompare(b.name, 'pt-BR', { numeric: true });
        }
        if (aTime > 0 && bTime === 0) return -1;
        if (aTime === 0 && bTime > 0) return 1;

        return a.name.localeCompare(b.name, 'pt-BR', { numeric: true });
      });

      if (search.trim()) {
        const matchSearch = ap.name.toLowerCase().includes(search.toLowerCase());
        if (boxesInApiary.length === 0 && !matchSearch) {
          return;
        }
      }

      sections.push({
        apiaryId: ap.id,
        apiaryName: ap.name,
        role: ap.role,
        lastModifiedTime,
        boxes: boxesInApiary,
      });
    });

    // Ordenar as seções de apiários:
    // Sempre em ordem alfabética quando entra no app (sem modificações recentes na sessão).
    // Quando mexidas recentemente, vai ficando no topo as que foram mexidas por último (maior timestamp).
    sections.sort((a, b) => {
      const aTime = a.lastModifiedTime;
      const bTime = b.lastModifiedTime;

      if (aTime > 0 && bTime > 0) {
        if (bTime !== aTime) return bTime - aTime;
        return a.apiaryName.localeCompare(b.apiaryName, 'pt-BR');
      }

      if (aTime > 0 && bTime === 0) return -1;
      if (aTime === 0 && bTime > 0) return 1;

      return a.apiaryName.localeCompare(b.apiaryName, 'pt-BR');
    });

    setApiarySections(sections);
  }, [selectedApiaryId, search, selectedApiaryName, role]);

  useEffect(() => {
    const unsubscribe = subscribeSessionModifications(() => {
      void loadBoxes();
    });
    return unsubscribe;
  }, [loadBoxes]);

  useFocusEffect(
    useCallback(() => {
      void loadBoxes();
      if (selectedApiaryId) {
        loadApiary(selectedApiaryId).then((ap) => {
          if (ap?.role) {
            setRole(ap.role);
          } else {
            setRole('owner');
          }
        });
      } else {
        setRole('owner');
      }

      if (routeParams?.openAddBox) {
        setNewBoxName(normalizeBoxName(`Caixa ${String(boxes.length + 1).padStart(2, '0')}`));
        setAddBoxVisible(true);
      }
    }, [loadBoxes, selectedApiaryId, routeParams?.openAddBox, boxes.length])
  );

  function normalizeVoiceText(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[!?.,;:]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function findTargetBox(command: string, list: BoxItem[]): BoxItem | undefined {
    const numberWordMap: Record<string, string> = {
      um: '1',
      uma: '1',
      dois: '2',
      duas: '2',
      tres: '3',
      quatro: '4',
      cinco: '5',
      seis: '6',
      sete: '7',
      oito: '8',
      nove: '9',
      dez: '10',
    };

    let normalized = command;
    for (const [word, digit] of Object.entries(numberWordMap)) {
      normalized = normalized.replace(new RegExp(`\\b${word}\\b`, 'g'), digit);
    }

    for (const b of list) {
      const bNameNorm = normalizeVoiceText(b.name);
      if (normalized.includes(bNameNorm)) {
        return b;
      }
    }

    const match = normalized.match(/(?:caixa|colmeia|cx)?\s*(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      const found = list.find((b) => {
        const bDigits = b.name.match(/\d+/);
        if (bDigits && parseInt(bDigits[0], 10) === num) return true;
        return b.rawId === num;
      });
      if (found) return found;
    }

    return undefined;
  }

  useFocusEffect(
    useCallback(() => {
      const unsubscribe = registerScreenCommandHandler((transcript) => {
        const command = normalizeVoiceText(transcript);
        if (!command) return false;

        if (command === 'limpar busca' || command === 'limpar filtro' || command === 'mostrar todas') {
          setSearch('');
          return true;
        }

        if (command.startsWith('buscar ') || command.startsWith('pesquisar ')) {
          const query = command.replace(/^(buscar|pesquisar)\s+/, '').trim();
          if (query) {
            setSearch(query);
            return true;
          }
        }

        // Histórico ou anotações
        if (command.includes('historico') || command.includes('anotacoes') || command.includes('detalhes')) {
          const targetBox = findTargetBox(command, boxes);
          if (targetBox) {
            handleOpenAnnotations(targetBox);
            return true;
          }
        }

        // Ação direta de revisão
        if (command.includes('revisar') || command.includes('revisao')) {
          const targetBox = findTargetBox(command, boxes);
          if (targetBox) {
            navigation.navigate('BoxRevision', {
              boxId: targetBox.rawId,
              boxName: targetBox.name,
              apiaryName: targetBox.apiaryName,
              apiaryId: targetBox.apiaryId || null,
              tipo: 'apiario',
            });
            return true;
          }
        }

        // Ação direta de manejo
        if (command.includes('manejar') || command.includes('manejo')) {
          const targetBox = findTargetBox(command, boxes);
          if (targetBox) {
            navigation.navigate('BoxManejo', {
              boxId: targetBox.rawId,
              boxName: targetBox.name,
              apiaryName: targetBox.apiaryName,
              apiaryId: targetBox.apiaryId || null,
              tipo: 'apiario',
            });
            return true;
          }
        }

        // Abertura genérica da caixa de acordo com o modo atual
        if (command.startsWith('abrir caixa') || command.startsWith('caixa ') || command.startsWith('selecionar caixa')) {
          const targetBox = findTargetBox(command, boxes);
          if (targetBox) {
            if (mode === 'manejo') {
              navigation.navigate('BoxManejo', {
                boxId: targetBox.rawId,
                boxName: targetBox.name,
                apiaryName: targetBox.apiaryName,
                apiaryId: targetBox.apiaryId || null,
                tipo: 'apiario',
              });
            } else {
              navigation.navigate('BoxRevision', {
                boxId: targetBox.rawId,
                boxName: targetBox.name,
                apiaryName: targetBox.apiaryName,
                apiaryId: targetBox.apiaryId || null,
                tipo: 'apiario',
              });
            }
            return true;
          }
        }

        return false;
      });

      return () => {
        unsubscribe();
      };
    }, [boxes, mode, navigation, registerScreenCommandHandler])
  );

  const handleOpenRename = (box: BoxItem) => {
    setSelectedBoxForRename(box);
    setRenameValue(box.name);
    setRenameVisible(true);
  };

  const handleSaveRename = async () => {
    if (!selectedBoxForRename || !renameValue.trim()) return;
    try {
      await renameRegisteredBox(selectedBoxForRename.rawId, renameValue.trim());
      setRenameVisible(false);
      setSelectedBoxForRename(null);
      void loadBoxes();
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Falha ao renomear caixa.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteBoxId) return;
    try {
      await deleteRegisteredBox(deleteBoxId);
      setDeleteBoxId(null);
      void loadBoxes();
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Falha ao excluir caixa.');
    }
  };

  const handleConfirmArchive = async () => {
    if (!archiveBoxId) return;
    try {
      await archiveBox(archiveBoxId);
      setArchiveBoxId(null);
      void loadBoxes();
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Falha ao arquivar caixa.');
    }
  };

  const handleOpenAnnotations = (box: BoxItem) => {
    setSelectedBoxForAnnotations(box);
    setAnnotationsModalVisible(true);
  };

  const handleArchiveHistoryItem = async (item: any) => {
    try {
      if (item.category === 'Revisão') {
        await archiveRevision(item.id);
      } else if (item.category === 'Manejo') {
        await archiveManejo(item.id);
      }
      void loadBoxes();
    } catch (err: any) {
      Alert.alert('Erro', 'Falha ao arquivar item.');
    }
  };

  const handleOpenAddBox = (apiaryId?: number, apiaryName?: string) => {
    const aid = apiaryId || selectedApiaryId || apiarySections[0]?.apiaryId;
    const aname = apiaryName || selectedApiaryName || apiarySections[0]?.apiaryName || '';
    if (aid) {
      setTargetAddApiary({ id: aid, name: aname });
    }
    const currentApiaryBoxes = boxes.filter((b) => b.apiaryId === aid);
    const nextNum = currentApiaryBoxes.length + 1;
    setNewBoxName(normalizeBoxName(`Caixa ${String(nextNum).padStart(2, '0')}`));
    setAddBoxVisible(true);
  };

  const handleSaveAddBox = async () => {
    const aid = targetAddApiary?.id || selectedApiaryId;
    if (!aid || !newBoxName.trim()) return;
    try {
      setAddingBox(true);
      const created = await createRegisteredBox({
        apiaryId: aid,
        name: newBoxName.trim(),
      });
      if (created?.id) {
        markBoxModifiedInSession(created.id, 'revisao');
      }
      setAddBoxVisible(false);
      setNewBoxName('');
      await loadBoxes();
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Falha ao adicionar caixa.');
    } finally {
      setAddingBox(false);
    }
  };

  return {
    colors,
    boxes,
    apiarySections,
    targetAddApiary,
    search,
    setSearch,
    renameVisible,
    setRenameVisible,
    selectedBoxForRename,
    renameValue,
    setRenameValue,
    deleteBoxId,
    setDeleteBoxId,
    archiveBoxId,
    setArchiveBoxId,
    addBoxVisible,
    setAddBoxVisible,
    newBoxName,
    setNewBoxName,
    addingBox,
    handleOpenAddBox,
    handleSaveAddBox,
    error,
    annotationsModalVisible,
    setAnnotationsModalVisible,
    selectedBoxForAnnotations,
    allRevisions,
    allManejos,
    detailedAnnotation,
    setDetailedAnnotation,
    selectedApiaryId,
    selectedApiaryName,
    mode,
    role,
    handleOpenAnnotations,
    handleOpenRename,
    handleSaveRename,
    handleConfirmDelete,
    handleConfirmArchive,
    handleArchiveHistoryItem,
  };
}
