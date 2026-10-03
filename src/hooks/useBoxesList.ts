import { useCallback, useState } from 'react';
import { Alert, Keyboard } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { listRegisteredBoxes, renameRegisteredBox, deleteRegisteredBox, archiveBox } from '../services/boxService';
import { listRevisionReports, archiveRevision } from '../services/reviewReportService';
import { listManejoReports, archiveManejo } from '../services/manejoService';
import { loadApiary } from '../services/apiaryService';
import { useVoiceCommand } from '../voice/VoiceCommandContext';
import { APP_SESSION_START } from '../utils/session';
import { isBoxModifiedInSession, getBoxSessionModification } from '../services/sessionStore';
import type { RootStackParamList } from '../types/auth';
import { useAppTheme } from '../theme/ThemeContext';

export type BoxItem = {
  id: string;
  rawId: number;
  type: 'box';
  name: string;
  apiaryName: string;
  apiaryId?: number;
  isHandled?: boolean;
  modificationType?: 'revisao' | 'manejo' | 'both' | null;
  role?: 'reader' | 'editor' | 'owner';
};

export function useBoxesList(navigation: any, routeParams: any) {
  const { colors } = useAppTheme();
  const { registerScreenCommandHandler } = useVoiceCommand();

  const [boxes, setBoxes] = useState<BoxItem[]>([]);
  const [search, setSearch] = useState('');
  const [renameVisible, setRenameVisible] = useState(false);
  const [selectedBoxForRename, setSelectedBoxForRename] = useState<BoxItem | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteBoxId, setDeleteBoxId] = useState<number | null>(null);
  const [archiveBoxId, setArchiveBoxId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    const [allBoxes, revData, manData] = await Promise.all([
      listRegisteredBoxes(selectedApiaryId ? { apiaryId: selectedApiaryId, search } : { search }),
      listRevisionReports(),
      listManejoReports(),
    ]);

    setAllRevisions(revData);
    setAllManejos(manData);

    const handledBoxIds = new Set<string>();

    const addHandled = (id: number, date: string) => {
      if (date && date >= APP_SESSION_START) {
        handledBoxIds.add(`box-${id}`);
      }
    };

    revData.forEach((r) => addHandled(r.caixaId, r.createdAt));
    manData.forEach((m) => addHandled(m.caixaId, m.createdAt));

    const items: BoxItem[] = [];

    allBoxes.forEach((b) => {
      const sessionMod = getBoxSessionModification(b.id);
      const isModifiedThisSession = 
        !!sessionMod ||
        (b.createdAt && b.createdAt >= APP_SESSION_START) ||
        (b.updatedAt && b.updatedAt >= APP_SESSION_START);
      
      if (isModifiedThisSession) {
        handledBoxIds.add(`box-${b.id}`);
      }

      items.push({
        id: `box-${b.id}`,
        rawId: b.id,
        type: 'box',
        name: b.name,
        apiaryName: b.apiaryName,
        apiaryId: b.apiaryId,
        isHandled: handledBoxIds.has(`box-${b.id}`),
        modificationType: sessionMod?.type || (isModifiedThisSession ? 'both' : null),
      });
    });

    // Ordenar: mexidas nesta sessão primeiro, depois por nome
    items.sort((a, b) => {
      if (a.isHandled && !b.isHandled) return -1;
      if (!a.isHandled && b.isHandled) return 1;
      return a.name.localeCompare(b.name);
    });

    setBoxes(items);
  }, [selectedApiaryId, search]);

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
    }, [loadBoxes, selectedApiaryId])
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

  return {
    colors,
    boxes,
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
