import { useState, useMemo, useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert } from 'react-native';
import { deleteRevision, listRevisionReports, archiveRevision } from '../services/reviewReportService';
import { deleteManejoService, listManejoReports, archiveManejo } from '../services/manejoService';
import { useAppTheme } from '../theme/ThemeContext';
import { ReviewReport } from '../types/reviewReport';
import { ManejoReport } from '../types/manejo';

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

export function groupReportsByApiary(flatReports: any[]) {
  return flatReports.reduce((acc: Record<string, any[]>, report) => {
    const apiaryName = report.apiaryName || 'Apiário Geral';
    if (!acc[apiaryName]) {
      acc[apiaryName] = [];
    }
    acc[apiaryName].push(report);
    return acc;
  }, {});
}

export function useReviewReportsList(routeParams: any) {
  const { colors } = useAppTheme();

  const apiaryId = routeParams?.apiaryId ? Number(routeParams.apiaryId) : undefined;
  const apiaryName = routeParams?.apiaryName;

  const today = useMemo(() => new Date(), []);
  
  const toIsoDate = useCallback((date: Date): string => {
    return date.toISOString().slice(0, 10);
  }, []);

  const defaultFrom = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 7);
    return toIsoDate(d);
  }, [today, toIsoDate]);

  const defaultTo = useMemo(() => {
    return toIsoDate(today);
  }, [today, toIsoDate]);

  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);
  const [quickFilter, setQuickFilter] = useState<'thisMonth' | '7days' | 'all'>('7days');

  useEffect(() => {
    if (quickFilter === '7days') {
      const date = new Date();
      date.setDate(date.getDate() - 7);
      setFromDate(toIsoDate(date));
      setToDate(toIsoDate(new Date()));
    } else if (quickFilter === 'thisMonth') {
      const date = new Date();
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
      setFromDate(toIsoDate(firstDay));
      setToDate(toIsoDate(new Date()));
    } else if (quickFilter === 'all') {
      const date = new Date();
      date.setDate(date.getDate() - 180);
      setFromDate(toIsoDate(date));
      setToDate(toIsoDate(new Date()));
    }
  }, [quickFilter, toIsoDate]);

  const [reports, setReports] = useState<ReviewReport[]>([]);
  const [manejos, setManejos] = useState<ManejoReport[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteManejoId, setDeleteManejoId] = useState<number | null>(null);

  const [activeTab, setActiveTab] = useState<'revisoes' | 'manejos'>(
    routeParams?.initialTab === 'manejos' ? 'manejos' : 'revisoes'
  );

  useEffect(() => {
    if (routeParams?.initialTab) {
      setActiveTab(routeParams.initialTab);
    }
  }, [routeParams?.initialTab]);

  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [revData, manData] = await Promise.all([
        listRevisionReports({ tipo: 'apiario', apiaryId, fromDate, toDate }),
        listManejoReports({ tipo: 'apiario', apiaryId, fromDate, toDate }),
      ]);
      setReports(revData);
      setManejos(manData);
    } catch (err) {
      console.error('[useReviewReportsList] Error loading data:', err);
    }
  }, [apiaryId, fromDate, toDate]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      if (routeParams?.initialTab) {
        setActiveTab(routeParams.initialTab);
      }
      async function load(): Promise<void> {
        setLoading(true);
        await loadData();
        if (mounted) setLoading(false);
      }
      void load();
      return () => {
        mounted = false;
      };
    }, [loadData, routeParams?.initialTab])
  );

  async function handleArchiveSingle(id: number) {
    try {
      setLoading(true);
      if (activeTab === 'revisoes') await archiveRevision(id);
      else if (activeTab === 'manejos') await archiveManejo(id);
      await loadData();
    } catch (err) {
      Alert.alert('Erro', 'Falha ao arquivar item.');
    } finally {
      setLoading(false);
    }
  }

  function handleDelete(id: number) {
    setDeleteId(id);
  }

  async function confirmDelete() {
    if (deleteId) {
      await deleteRevision(deleteId);
      setDeleteId(null);
      await loadData();
    }
  }

  function handleDeleteManejo(id: number) {
    setDeleteManejoId(id);
  }

  async function confirmDeleteManejo() {
    if (deleteManejoId) {
      await deleteManejoService(deleteManejoId);
      setDeleteManejoId(null);
      await loadData();
    }
  }

  async function handleArchiveRevisionItem(id: number) {
    await archiveRevision(id);
    await loadData();
  }

  async function handleArchiveManejoItem(id: number) {
    await archiveManejo(id);
    await loadData();
  }

  const filteredReports = useMemo(() => {
    return reports
      .filter((report) => {
        const apiName = report.apiaryName || 'Apiário Geral';
        const boxName = report.caixaName || 'Sem Nome';
        if (searchTerm.trim()) {
          const s = searchTerm.toLowerCase();
          const matchApi = apiName.toLowerCase().includes(s);
          const matchBox = boxName.toLowerCase().includes(s);
          const matchObs = (report.observacoes || '').toLowerCase().includes(s);
          const matchInd = (report.indicacoes || '').toLowerCase().includes(s);
          return matchApi || matchBox || matchObs || matchInd;
        }
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [reports, searchTerm]);

  const filteredManejos = useMemo(() => {
    return manejos
      .filter((report) => {
        const apiName = report.apiaryName || 'Apiário Geral';
        const boxName = report.caixaName || 'Sem Nome';
        if (searchTerm.trim()) {
          const s = searchTerm.toLowerCase();
          const matchApi = apiName.toLowerCase().includes(s);
          const matchBox = boxName.toLowerCase().includes(s);
          const matchObs = (report.observacoes || '').toLowerCase().includes(s);
          const matchInd = (report.indicacoes || '').toLowerCase().includes(s);
          const matchTasks = (report.checkedOptions || []).some((task) => {
            const label = task.id === 'outro' && task.customName ? task.customName : (MANEJO_OPTION_LABELS[task.id] || task.id);
            return label.toLowerCase().includes(s) || (task.obs || '').toLowerCase().includes(s) || (task.ind || '').toLowerCase().includes(s);
          });
          return matchApi || matchBox || matchObs || matchInd || matchTasks;
        }
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [manejos, searchTerm]);

  const groupedReports = useMemo(() => {
    return Object.entries(groupReportsByApiary(filteredReports));
  }, [filteredReports]);

  const groupedManejos = useMemo(() => {
    return Object.entries(groupReportsByApiary(filteredManejos));
  }, [filteredManejos]);

  return {
    colors,
    apiaryId,
    apiaryName,
    reports,
    manejos,
    searchTerm,
    setSearchTerm,
    deleteId,
    setDeleteId,
    deleteManejoId,
    setDeleteManejoId,
    activeTab,
    setActiveTab,
    loading,
    loadData,
    handleArchiveSingle,
    handleDelete,
    confirmDelete,
    handleDeleteManejo,
    confirmDeleteManejo,
    handleArchiveRevisionItem,
    handleArchiveManejoItem,
    filteredReports,
    filteredManejos,
    groupedReports,
    groupedManejos,
    fromDate,
    toDate,
    quickFilter,
    setQuickFilter,
  };
}
