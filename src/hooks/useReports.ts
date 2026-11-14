import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert, ScrollView } from 'react-native';
import type { ReportsStatsResponse } from '../services/reportsService';
import { archiveRevision } from '../services/reviewReportService';
import { archiveManejo } from '../services/manejoService';
import { displayDateToIso, isDisplayDateValid, maskDateInput, isoDateToDisplay } from '../utils/date';
import {
  computeGrowthMetrics,
  isInDateWindow,
  matchesManejoSearch,
  matchesRevisionSearch,
  toBox,
  toIsoDate,
} from '../utils/reportMetrics';
import { useVoiceCommand } from '../voice/VoiceCommandContext';
import { parseReportsVoiceCommand, type ReportsQuickFilter } from '../voice/reportsVoiceCommands';
import { useAppTheme } from '../theme/ThemeContext';
import type { Apiary } from '../types/apiary';
import type { Box } from '../types/box';
import type { ReviewReport } from '../types/reviewReport';
import type { ManejoReport } from '../types/manejo';
import type { ReportsFilter } from '../types/reports';
import { getLocalApiaries, getLocalBoxes, getLocalRevisions, getLocalManejos } from '../services/localDbService';
import { subscribeToSyncStatus } from '../services/syncService';
import { useReportEditing } from './useReportEditing';

/**
 * Estado da tela de relatórios: filtros, lista paginada, métricas do período
 * e comandos de voz. A edição e a exclusão ficam em useReportEditing; os
 * cálculos, em utils/reportMetrics.
 *
 * Lê só o SQLite local e recarrega ao voltar para a tela e ao terminar um sync.
 */
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
  const [quickFilter, setQuickFilter] = useState<ReportsQuickFilter>(() => {
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

  // Scroll references
  const scrollRef = useRef<ScrollView>(null);
  const [scrollY, setScrollY] = useState(0);

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
      date.setFullYear(date.getFullYear() - 10);
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

        const searchPattern = searchTerm.trim().toLowerCase();
        const filteredApiaries = ownedApiaries.filter((item) => isInDateWindow(item.created_at, dateWindow));
        const filteredBoxes = allBoxes.filter(isOwned).filter((item) => isInDateWindow(item.created_at, dateWindow));
        const filteredRevisions = allRevisions.filter(isOwned).filter((item) => matchesRevisionSearch(item, searchPattern));
        const filteredManejos = allManejos.filter(isOwned).filter((item) => matchesManejoSearch(item, searchPattern));

        setBoxes(allBoxes.filter(isOwned).map(toBox));
        setRevisions(filteredRevisions);
        setManejos(filteredManejos);
        setMetrics(computeGrowthMetrics({
          filter,
          window: dateWindow,
          apiaries: filteredApiaries,
          boxes: filteredBoxes,
          revisions: filteredRevisions,
          manejos: filteredManejos,
        }));
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

  useEffect(() => {
    const unsubscribe = subscribeToSyncStatus((status) => {
      if (!status.isSyncing) {
        void loadData(true);
      }
    });
    return () => {
      unsubscribe();
    };
  }, [loadData]);

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



  const editing = useReportEditing(reloadData);

  // O tratador de voz é registrado uma vez por foco: lê a edição atual pela ref.
  const editingRef = useRef(editing);
  editingRef.current = editing;

  useFocusEffect(
    useCallback(() => {
      const unsubscribe = registerScreenCommandHandler((transcript) => {
        const action = parseReportsVoiceCommand(transcript);
        if (!action) return false;

        switch (action.type) {
          case 'scrollEditorToNotes':
            editingRef.current.scrollEditorToNotes();
            break;
          case 'closeEditors':
            editingRef.current.closeEditors();
            break;
          case 'setFilter':
            setFilter(action.filter);
            break;
          case 'reload':
            void reloadData();
            break;
          case 'setLastDays': {
            const end = new Date();
            const start = new Date(end);
            start.setDate(start.getDate() - action.days);
            setFromDate(isoDateToDisplay(toIsoDate(start)));
            setToDate(isoDateToDisplay(toIsoDate(end)));
            break;
          }
          case 'setQuickFilter':
            setQuickFilter(action.quickFilter);
            break;
          case 'setSearch':
            setSearchTerm(action.term);
            break;
        }
        return true;
      });
      return unsubscribe;
    }, [registerScreenCommandHandler, reloadData])
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
    ...editing,
    scrollRef,
    scrollY,
    setScrollY,
    reloadData,
    handleArchiveSingle,
    maskDateInput,
    getRoleForApiary: useCallback((apiaryId?: number | null) => {
      if (!apiaryId) return 'owner';
      return apiaryRoles[apiaryId] || 'owner';
    }, [apiaryRoles]),
  };
}
