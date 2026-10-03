import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert, ScrollView } from 'react-native';
import { fetchReportsStats, type ReportsStatsResponse } from '../services/reportsService';
import { updateRevision, deleteRevision, archiveRevision } from '../services/reviewReportService';
import { updateManejoService, deleteManejoService, archiveManejo } from '../services/manejoService';
import { displayDateToIso, isDisplayDateValid, maskDateInput, isoDateToDisplay } from '../utils/date';
import { useVoiceCommand } from '../voice/VoiceCommandContext';
import { useAppTheme } from '../theme/ThemeContext';
import type { Apiary } from '../types/apiary';
import type { Box } from '../types/box';
import type { ReviewReport } from '../types/reviewReport';
import type { ManejoReport } from '../types/manejo';
import type { ReportsFilter } from '../types/reports';
import * as ImagePicker from 'expo-image-picker';
import { 
  getLocalApiaries, 
  getLocalBoxes, 
  getLocalRevisions, 
  getLocalManejos 
} from '../services/localDbService';

const MANEJO_OPTION_LABELS: Record<string, string> = {
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
  'trocar-caixa': 'Caixa trocada',
  outro: 'Outro',
};

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function useReports(routeParams?: any) {
  const { colors } = useAppTheme();
  const { registerScreenCommandHandler } = useVoiceCommand();

  const [filter, setFilter] = useState<ReportsFilter>('revisoes');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const today = useMemo(() => new Date(), []);
  const defaultFrom = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 7);
    return isoDateToDisplay(toIsoDate(d));
  }, [today]);

  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(isoDateToDisplay(toIsoDate(today)));

  const [apiaries, setApiaries] = useState<Apiary[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [revisions, setRevisions] = useState<ReviewReport[]>([]);
  const [manejos, setManejos] = useState<ManejoReport[]>([]);
  const [apiaryRoles, setApiaryRoles] = useState<Record<number, string>>({});

  const [metrics, setMetrics] = useState<ReportsStatsResponse['metrics'] | null>(null);

  // Pagination states
  const [paginatedItems, setPaginatedItems] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  // Quick Filters states
  const [quickFilter, setQuickFilter] = useState<'all' | '7days' | 'thisMonth' | 'apiary' | 'box'>(() => {
    if (routeParams?.caixaId) return 'box';
    if (routeParams?.apiaryId) return 'apiary';
    return '7days';
  });
  const [selectedApiaryId, setSelectedApiaryId] = useState<number | null>(routeParams?.apiaryId || null);
  const [selectedBoxId, setSelectedBoxId] = useState<number | null>(routeParams?.caixaId || null);

  useEffect(() => {
    if (routeParams?.caixaId) {
      setQuickFilter('box');
      setSelectedBoxId(routeParams.caixaId);
    } else if (routeParams?.apiaryId) {
      setQuickFilter('apiary');
      setSelectedApiaryId(routeParams.apiaryId);
    }
  }, [routeParams]);

  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<string | null>(null);

  // Modals & edit states
  const [editingReport, setEditingReport] = useState<ReviewReport | null>(null);
  const [editObs, setEditObs] = useState('');
  const [editInd, setEditInd] = useState('');
  const [editChecked, setEditChecked] = useState<Record<string, boolean>>({});

  const [editingManejo, setEditingManejo] = useState<ManejoReport | null>(null);
  const [editManejoObs, setEditManejoObs] = useState('');
  const [editManejoInd, setEditManejoInd] = useState('');
  const [editManejoTasks, setEditManejoTasks] = useState<
    Record<string, { id: string; obs: string; ind: string; active: boolean; customName?: string }>
  >({});
  const [editManejoPhotoUri, setEditManejoPhotoUri] = useState<string | undefined>();

  // Delete confirmations
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteManejoId, setDeleteManejoId] = useState<number | null>(null);

  // Scroll references
  const scrollRef = useRef<ScrollView>(null);
  const [scrollY, setScrollY] = useState(0);
  const editRevisionScrollRef = useRef<ScrollView>(null);
  const editManejoScrollRef = useRef<ScrollView>(null);

  const dateWindow = useMemo(() => {
    if (!isDisplayDateValid(fromDate) || !isDisplayDateValid(toDate)) return null;
    const fromIso = displayDateToIso(fromDate);
    const toIso = displayDateToIso(toDate);
    if (fromIso > toIso) return null;
    return { fromIso, toIso };
  }, [fromDate, toDate]);

  useEffect(() => {
    if (quickFilter === '7days') {
      const date = new Date();
      date.setDate(date.getDate() - 7);
      setFromDate(isoDateToDisplay(toIsoDate(date)));
      setToDate(isoDateToDisplay(toIsoDate(new Date())));
    } else if (quickFilter === 'thisMonth') {
      const date = new Date();
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
      setFromDate(isoDateToDisplay(toIsoDate(firstDay)));
      setToDate(isoDateToDisplay(toIsoDate(new Date())));
    } else if (quickFilter === 'all') {
      const date = new Date();
      date.setDate(date.getDate() - 180);
      setFromDate(isoDateToDisplay(toIsoDate(date)));
      setToDate(isoDateToDisplay(toIsoDate(new Date())));
    }
  }, [quickFilter]);

  const PAGE_SIZE = 15;
  const requestCounter = useRef(0);

  const loadData = useCallback(async (isFirstPage: boolean) => {
    if (!dateWindow) return;
    const requestId = ++requestCounter.current;

    if (isFirstPage) {
      setLoading(true);
      setPage(0);
      setHasMore(true);
    }

    try {
      const allApiaries = await getLocalApiaries();
      if (requestId !== requestCounter.current) return;

      const rolesMap: Record<number, string> = {};
      allApiaries.forEach((a) => {
        rolesMap[a.id] = a.role || 'owner';
      });
      setApiaryRoles(rolesMap);
      setApiaries(allApiaries);

      const ownedApiaries = allApiaries;
      const ownedApiaryIds = new Set(ownedApiaries.map((a) => a.id));
      const isOwned = (item: any) => 
        !(item.apiaryId || item.apiary_id) || 
        ownedApiaryIds.has(item.apiaryId || item.apiary_id) ||
        item.synced === false ||
        item.synced === 0;

      const currentPage = isFirstPage ? 0 : page + 1;
      const offset = currentPage * PAGE_SIZE;

      let fetchedItems: any[] = [];
      const s = searchTerm.trim();
      const filterApiaryId = quickFilter === 'apiary' ? selectedApiaryId : undefined;
      const filterBoxId = quickFilter === 'box' ? selectedBoxId : undefined;

      const isFilterMissing = (quickFilter === 'apiary' && selectedApiaryId === null) || (quickFilter === 'box' && selectedBoxId === null);

      if (!isFilterMissing) {
        const queryParams: {
          tipo: 'apiario';
          includeArchived: boolean;
          fromDate: string;
          toDate: string;
          apiaryId?: number;
          caixaId?: number;
          search?: string;
          limit: number;
          offset: number;
        } = {
          tipo: 'apiario',
          includeArchived: true,
          fromDate: dateWindow.fromIso,
          toDate: dateWindow.toIso,
          apiaryId: filterApiaryId || undefined,
          caixaId: filterBoxId || undefined,
          search: s || undefined,
          limit: PAGE_SIZE * 5,
          offset: offset,
        };

        if (filter === 'revisoes') {
          fetchedItems = await getLocalRevisions(queryParams);
        } else if (filter === 'manejos') {
          fetchedItems = await getLocalManejos(queryParams);
        }
      }

      if (requestId !== requestCounter.current) return;

      fetchedItems = fetchedItems.filter(isOwned).slice(0, PAGE_SIZE);

      if (isFirstPage) {
        setPaginatedItems(fetchedItems);
      } else {
        setPaginatedItems((prev) => [...prev, ...fetchedItems]);
        setPage(currentPage);
      }

      if (fetchedItems.length < PAGE_SIZE) {
        setHasMore(false);
      }

      // Calculate growth and metrics ONLY if filter is 'apiarios' or 'caixas'
      if (filter === 'apiarios' || filter === 'caixas') {
        const [allBoxes, allRevisions, allManejos] = await Promise.all([
          getLocalBoxes({ includeArchived: true, showAll: true }),
          getLocalRevisions({ tipo: 'apiario', includeArchived: true, fromDate: dateWindow.fromIso, toDate: dateWindow.toIso }),
          getLocalManejos({ tipo: 'apiario', includeArchived: true, fromDate: dateWindow.fromIso, toDate: dateWindow.toIso }),
        ]);

        if (requestId !== requestCounter.current) return;

        const { fromIso, toIso } = dateWindow;
        const searchPattern = searchTerm.trim().toLowerCase();

        const extractDateOnly = (val: string) => val.includes('T') ? val.slice(0, 10) : val;
        const isInWindow = (dateStr: string) => {
          const d = extractDateOnly(dateStr);
          return d >= fromIso && d <= toIso;
        };

        const filteredApiaries = ownedApiaries.filter((item) => isInWindow(item.created_at));
        const filteredBoxes = allBoxes.filter(isOwned).filter((item) => isInWindow(item.created_at));

        const filteredRevisions = allRevisions
          .filter(isOwned)
          .filter((item) => {
            if (searchPattern) {
              const matchApi = (item.apiaryName || '').toLowerCase().includes(searchPattern);
              const matchBox = (item.caixaName || '').toLowerCase().includes(searchPattern);
              const matchObs = (item.observacoes || '').toLowerCase().includes(searchPattern);
              const matchInd = (item.indicacoes || '').toLowerCase().includes(searchPattern);
              return matchApi || matchBox || matchObs || matchInd;
            }
            return true;
          });

        const filteredManejos = allManejos
          .filter(isOwned)
          .filter((item) => {
            if (searchPattern) {
              const matchApi = (item.apiaryName || '').toLowerCase().includes(searchPattern);
              const matchBox = (item.caixaName || '').toLowerCase().includes(searchPattern);
              const matchObs = (item.observacoes || '').toLowerCase().includes(searchPattern);
              const matchInd = (item.indicacoes || '').toLowerCase().includes(searchPattern);
              const matchTasks = (item.checkedOptions || []).some((task: any) => {
                const label = MANEJO_OPTION_LABELS[task.id] || task.id;
                return (
                  label.toLowerCase().includes(searchPattern) ||
                  (task.obs || '').toLowerCase().includes(searchPattern) ||
                  (task.ind || '').toLowerCase().includes(searchPattern)
                );
              });
              return matchApi || matchBox || matchObs || matchInd || matchTasks;
            }
            return true;
          });

        const periodDays = (() => {
          const from = new Date(fromIso);
          const to = new Date(toIso);
          const ms = to.getTime() - from.getTime();
          const days = Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
          return Number.isFinite(days) && days > 0 ? days : 1;
        })();

        const totalApiaries = filteredApiaries.length;
        const totalBoxes = filteredBoxes.length;

        const midpoint = Math.ceil(periodDays / 2);
        const sortedApiaries = [...filteredApiaries].sort((a, b) => a.created_at.localeCompare(b.created_at));
        const sortedBoxes = [...filteredBoxes].sort((a, b) => a.created_at.localeCompare(b.created_at));

        const apiaryBaseline = sortedApiaries.slice(0, Math.max(sortedApiaries.length - midpoint, 0)).length;
        const boxBaseline = sortedBoxes.slice(0, Math.max(sortedBoxes.length - midpoint, 0)).length;

        const calcGrowth = (current: number, baseline: number) => {
          if (baseline <= 0) return current > 0 ? 100 : 0;
          return Number((((current - baseline) / baseline) * 100).toFixed(1));
        };

        const apiaryGrowthPercent = calcGrowth(totalApiaries, apiaryBaseline);
        const boxGrowthPercent = calcGrowth(totalBoxes, boxBaseline);

        const locationCount = new Map<string, number>();
        for (const apiary of filteredApiaries) {
          const location = (apiary.location || '').trim() || 'Sem local definido';
          locationCount.set(location, (locationCount.get(location) ?? 0) + 1);
        }
        const topLocations = [...locationCount.entries()]
          .map(([location, total]) => ({ location, total }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 5);

        const start = new Date(fromIso);
        const end = new Date(toIso);
        const spanMs = end.getTime() - start.getTime();
        const stepMs = Math.max(Math.floor(spanMs / 4), 1000 * 60 * 60 * 24);

        const labels = ['S1', 'S2', 'S3', 'S4'];
        const boundaries = [0, 1, 2, 3].map((index) => new Date(start.getTime() + stepMs * (index + 1)));

        let targetDates: string[] = [];
        if (filter === 'apiarios') {
          targetDates = filteredApiaries.map((item) => item.created_at.slice(0, 10));
        } else if (filter === 'caixas') {
          targetDates = filteredBoxes.map((item) => item.created_at.slice(0, 10));
        } else if (filter === 'revisoes') {
          targetDates = filteredRevisions.map((item) => item.createdAt.slice(0, 10));
        } else if (filter === 'manejos') {
          targetDates = filteredManejos.map((item) => item.createdAt.slice(0, 10));
        }

        const barsData = labels.map((label, index) => {
          const upperBoundary = boundaries[index] ?? end;
          const total = targetDates.filter((iso) => {
            const date = new Date(iso);
            if (Number.isNaN(date.getTime())) return false;
            if (index === 0) return date >= start && date <= upperBoundary;
            const lowerBoundary = boundaries[index - 1];
            return date > lowerBoundary && date <= upperBoundary;
          }).length;
          return { label, value: total };
        });

        setBoxes(allBoxes.filter(isOwned).map((r) => ({
          id: r.id,
          apiaryId: r.apiary_id,
          apiaryName: r.apiary_name || '',
          name: r.name,
          position: r.position,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          archived: !!r.archived,
        })));
        setRevisions(filteredRevisions);
        setManejos(filteredManejos);
        setMetrics({
          periodDays,
          totalApiaries,
          totalBoxes,
          apiaryGrowthPercent,
          boxGrowthPercent,
          topLocations,
          barsData,
        });
      }
    } catch (err) {
      console.error(err);
      setError('Falha ao carregar dados dos relatórios.');
    } finally {
      if (requestId === requestCounter.current) {
        setLoading(false);
      }
    }
  }, [filter, dateWindow, selectedApiaryId, selectedBoxId, searchTerm, quickFilter, routeParams?.tipo, page]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    void loadData(false);
  }, [loading, hasMore, loadData]);

  const reloadData = useCallback(async () => {
    await loadData(true);
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      void loadData(true);
    }, [filter, dateWindow, selectedApiaryId, selectedBoxId, searchTerm, quickFilter])
  );

  useFocusEffect(
    useCallback(() => {
      const unsubscribe = registerScreenCommandHandler((transcript) => {
        const command = transcript
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[!?.,;:]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (!command) return false;

        // Filtros de Tipo
        if (command.includes('revisao') || command.includes('revisoes')) {
          setFilter('revisoes');
          return true;
        }

        if (command.includes('manejo') || command.includes('manejos')) {
          setFilter('manejos');
          return true;
        }

        if (command.includes('apiario') || command.includes('apiarios')) {
          setFilter('apiarios');
          return true;
        }

        if (command.includes('caixa') || command.includes('caixas')) {
          setFilter('caixas');
          return true;
        }

        // Filtros Rápidos de Data
        if (command.includes('7 dias') || command.includes('sete dias') || command.includes('ultima semana')) {
          setQuickFilter('7days');
          return true;
        }

        if (
          command.includes('este mes') ||
          command.includes('mes atual') ||
          command.includes('30 dias') ||
          command.includes('trinta dias')
        ) {
          setQuickFilter('thisMonth');
          return true;
        }

        if (command.includes('todo periodo') || command.includes('todas as datas') || command.includes('todo o tempo')) {
          setQuickFilter('all');
          return true;
        }

        // Busca
        if (command === 'limpar busca' || command === 'limpar pesquisa' || command === 'limpar filtro') {
          setSearchTerm('');
          return true;
        }

        if (command.startsWith('buscar ') || command.startsWith('pesquisar ') || command.startsWith('filtrar por ')) {
          const query = command.replace(/^(buscar|pesquisar|filtrar por)\s+/, '').trim();
          if (query) {
            setSearchTerm(query);
            return true;
          }
        }

        return false;
      });

      return () => {
        unsubscribe();
      };
    }, [registerScreenCommandHandler])
  );

  const barsData = useMemo(() => {
    if (metrics?.barsData) return metrics.barsData;
    return [
      { label: 'S1', value: 0 },
      { label: 'S2', value: 0 },
      { label: 'S3', value: 0 },
      { label: 'S4', value: 0 },
    ];
  }, [metrics]);

  const maxBar = useMemo(() => Math.max(...barsData.map((item: { label: string; value: number }) => item.value), 1), [barsData]);

  const summaryText = useMemo(() => {
    if (filter === 'revisoes') return `No período selecionado, você possui ${revisions.length} revisões registradas.`;
    if (filter === 'manejos') return `No período selecionado, foram registrados ${manejos.length} tarefas de manejo em campo.`;
    if (filter === 'apiarios') return `No período selecionado, você possui ${apiaries.length} apiários ativos e ${boxes.length} caixas registradas.`;
    return `No período selecionado, foram identificadas ${boxes.length} caixas cadastradas.`;
  }, [filter, revisions.length, manejos.length, apiaries.length, boxes.length]);

  const chartTitle = useMemo(() => {
    if (filter === 'apiarios') return 'Crescimento Apiários';
    if (filter === 'caixas') return 'Crescimento Caixas';
    return 'Evolução de Atividades';
  }, [filter]);

  async function handleArchiveSingle(id: number, type: 'revisao' | 'manejo') {
    try {
      setLoading(true);
      if (type === 'revisao') await archiveRevision(id);
      else if (type === 'manejo') await archiveManejo(id);
      await reloadData();
    } catch (err) {
      Alert.alert('Erro', 'Falha ao arquivar item.');
    } finally {
      setLoading(false);
    }
  }



  function handleOpenEditReport(report: ReviewReport) {
    setEditingReport(report);
    setEditObs(report.observacoes);
    setEditInd(report.indicacoes);
    const checkedObj: Record<string, boolean> = {};
    for (const opt of report.checkedOptions) {
      checkedObj[opt] = true;
    }
    setEditChecked(checkedObj);
  }

  async function handleSaveEditReport() {
    if (!editingReport) return;
    const checkedIds = Object.entries(editChecked)
      .filter(([, v]) => v)
      .map(([k]) => k);
    await updateRevision(editingReport.id, {
      observacoes: editObs,
      indicacoes: editInd,
      checkedOptions: checkedIds,
    });
    setEditingReport(null);
    await reloadData();
  }

  const toggleEditOption = useCallback((id: string) => {
    setEditChecked((prev) => {
      const nextObj = { ...prev, [id]: !prev[id] };
      if (nextObj[id]) {
        if (id === 'caixa') nextObj['nucleo'] = false;
        if (id === 'nucleo') nextObj['caixa'] = false;
        if (id === 'com-espaco') nextObj['sem-espaco'] = false;
        if (id === 'sem-espaco') nextObj['com-espaco'] = false;
        if (id === 'forca-fraca') {
          nextObj['forca-media'] = false;
          nextObj['forca-boa'] = false;
        }
        if (id === 'forca-media') {
          nextObj['forca-fraca'] = false;
          nextObj['forca-boa'] = false;
        }
        if (id === 'forca-boa') {
          nextObj['forca-fraca'] = false;
          nextObj['forca-media'] = false;
        }
      }
      return nextObj;
    });
  }, []);

  function handleOpenEditManejo(report: ManejoReport) {
    setEditingManejo(report);
    setEditManejoObs(report.observacoes);
    setEditManejoInd(report.indicacoes);
    setEditManejoPhotoUri(report.photoUri);
    const tasksObj: Record<string, { id: string; obs: string; ind: string; active: boolean; customName?: string }> = {};
    Object.keys(MANEJO_OPTION_LABELS).forEach((id) => {
      tasksObj[id] = { id, obs: '', ind: '', active: false, customName: '' };
    });
    report.checkedOptions.forEach((task) => {
      tasksObj[task.id] = { ...task, active: true };
    });
    setEditManejoTasks(tasksObj);
  }

  async function handleTakeManejoPhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Erro', 'Permissão para usar a câmera é necessária!');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setEditManejoPhotoUri(result.assets[0].uri);
    }
  }

  async function handleSaveEditManejo() {
    if (!editingManejo) return;
    const finalTasks = Object.values(editManejoTasks)
      .filter((t) => t.active)
      .map(({ id, obs, ind, customName }) => ({
        id,
        obs,
        ind,
        ...(id === 'outro' ? { customName } : {}),
      }));

    await updateManejoService(editingManejo.id, {
      checkedOptions: finalTasks,
      observacoes: editManejoObs,
      indicacoes: editManejoInd,
      photoUri: editManejoPhotoUri,
    });
    setEditingManejo(null);
    await reloadData();
  }

  const toggleEditManejoTask = (id: string) => {
    setEditManejoTasks((prev) => ({
      ...prev,
      [id]: { ...prev[id], active: !prev[id].active },
    }));
  };

  const updateEditManejoTaskDetail = (id: string, field: 'obs' | 'ind' | 'customName', value: string) => {
    setEditManejoTasks((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  function handleDeleteReport(id: number) {
    setDeleteId(id);
  }

  function handleDeleteManejo(id: number) {
    setDeleteManejoId(id);
  }

  async function confirmDeleteReport() {
    if (deleteId) {
      await deleteRevision(deleteId);
      setDeleteId(null);
      await reloadData();
    }
  }

  async function confirmDeleteManejo() {
    if (deleteManejoId) {
      await deleteManejoService(deleteManejoId);
      setDeleteManejoId(null);
      await reloadData();
    }
  }

  // Voice commands setup
  useFocusEffect(
    useCallback(() => {
      const unsubscribe = registerScreenCommandHandler((transcript) => {
        const command = transcript
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[!?.,;:]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (!command) return false;

        if (command.includes('observacoes') || command.includes('o que fazer')) {
          if (editingReport) editRevisionScrollRef.current?.scrollToEnd({ animated: true });
          if (editingManejo) editManejoScrollRef.current?.scrollToEnd({ animated: true });
          return true;
        }

        if (command.includes('encerrar')) {
          setEditingReport(null);
          setEditingManejo(null);
          return true;
        }

        if (command.includes('filtro revisao') || command.includes('mostrar revisoes')) {
          setFilter('revisoes');
          return true;
        }

        if (command.includes('filtro manejo') || command.includes('mostrar manejos')) {
          setFilter('manejos');
          return true;
        }

        if (command.includes('atualizar dados') || command.includes('recarregar relatorios')) {
          void reloadData();
          return true;
        }

        if (command.includes('ultimos 7 dias')) {
          const end = new Date();
          const start = new Date(end);
          start.setDate(start.getDate() - 7);
          setFromDate(isoDateToDisplay(toIsoDate(start)));
          setToDate(isoDateToDisplay(toIsoDate(end)));
          return true;
        }

        if (command.includes('ultimos 30 dias') || command.includes('ultimo mes')) {
          const end = new Date();
          const start = new Date(end);
          start.setDate(start.getDate() - 30);
          setFromDate(isoDateToDisplay(toIsoDate(start)));
          setToDate(isoDateToDisplay(toIsoDate(end)));
          return true;
        }

        return false;
      });

      return () => {
        unsubscribe();
      };
    }, [dateWindow, filter, apiaries, boxes, revisions, manejos, registerScreenCommandHandler, reloadData])
  );

  return {
    colors,
    filter,
    setFilter,
    loading,
    searchTerm,
    setSearchTerm,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    apiaries,
    boxes,
    revisions,
    setRevisions,
    manejos,
    setManejos,
    paginatedItems,
    loadMore,
    hasMore,
    quickFilter,
    setQuickFilter,
    selectedApiaryId,
    setSelectedApiaryId,
    selectedBoxId,
    setSelectedBoxId,
    barsData,
    maxBar,
    summaryText,
    chartTitle,
    error,
    setError,
    editingReport,
    setEditingReport,
    editObs,
    setEditObs,
    editInd,
    setEditInd,
    editChecked,
    setEditChecked,
    editingManejo,
    setEditingManejo,
    editManejoObs,
    setEditManejoObs,
    editManejoInd,
    setEditManejoInd,
    editManejoTasks,
    setEditManejoTasks,
    editManejoPhotoUri,
    setEditManejoPhotoUri,
    deleteId,
    setDeleteId,
    deleteManejoId,
    setDeleteManejoId,
    scrollRef,
    scrollY,
    setScrollY,
    editRevisionScrollRef,
    editManejoScrollRef,
    reloadData,
    handleArchiveSingle,
    handleOpenEditReport,
    handleSaveEditReport,
    toggleEditOption,
    handleOpenEditManejo,
    handleTakeManejoPhoto,
    handleSaveEditManejo,
    toggleEditManejoTask,
    updateEditManejoTaskDetail,
    handleDeleteReport,
    confirmDeleteReport,
    handleDeleteManejo,
    confirmDeleteManejo,
    maskDateInput,
    getRoleForApiary: useCallback((apiaryId?: number | null) => {
      if (!apiaryId) return 'owner';
      return apiaryRoles[apiaryId] || 'owner';
    }, [apiaryRoles]),
  };
}
