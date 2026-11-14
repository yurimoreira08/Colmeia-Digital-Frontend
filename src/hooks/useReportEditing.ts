import { useCallback, useRef, useState } from 'react';
import { Alert, type ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { deleteManejoService, updateManejoService } from '../services/manejoService';
import { deleteRevision, updateRevision } from '../services/reviewReportService';
import type { ManejoReport } from '../types/manejo';
import type { ReviewReport } from '../types/reviewReport';
import { MANEJO_OPTION_LABELS } from '../utils/reportMetrics';
import { applyOptionSelection } from '../utils/revisionOptions';

/** Tarefa de manejo no formulário de edição (inativa = desmarcada). */
export type EditableManejoTask = { id: string; obs: string; ind: string; active: boolean; customName?: string };

/**
 * Edição e exclusão de revisões e manejos a partir dos relatórios.
 *
 * Salvar e excluir gravam no SQLite local pelos services (que disparam o
 * sync) e depois chamam `reloadData` para atualizar a lista.
 */
export function useReportEditing(reloadData: () => Promise<void>) {
  // Revisão em edição
  const [editingReport, setEditingReport] = useState<ReviewReport | null>(null);
  const [editObs, setEditObs] = useState('');
  const [editInd, setEditInd] = useState('');
  const [editChecked, setEditChecked] = useState<Record<string, boolean>>({});

  // Manejo em edição
  const [editingManejo, setEditingManejo] = useState<ManejoReport | null>(null);
  const [editManejoObs, setEditManejoObs] = useState('');
  const [editManejoInd, setEditManejoInd] = useState('');
  const [editManejoTasks, setEditManejoTasks] = useState<Record<string, EditableManejoTask>>({});
  const [editManejoPhotoUri, setEditManejoPhotoUri] = useState<string | undefined>();

  // Exclusões aguardando confirmação
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteManejoId, setDeleteManejoId] = useState<number | null>(null);

  const editRevisionScrollRef = useRef<ScrollView>(null);
  const editManejoScrollRef = useRef<ScrollView>(null);

  function handleOpenEditReport(report: ReviewReport) {
    setEditingReport(report);
    setEditObs(report.observacoes);
    setEditInd(report.indicacoes);
    const checked: Record<string, boolean> = {};
    for (const option of report.checkedOptions) checked[option] = true;
    setEditChecked(checked);
  }

  async function handleSaveEditReport() {
    if (!editingReport) return;
    const checkedIds = Object.entries(editChecked)
      .filter(([, checked]) => checked)
      .map(([id]) => id);
    await updateRevision(editingReport.id, { observacoes: editObs, indicacoes: editInd, checkedOptions: checkedIds });
    setEditingReport(null);
    await reloadData();
  }

  const toggleEditOption = useCallback((id: string) => {
    // Mesmas regras da revisão nova (exclusões e ovos implica rainha).
    setEditChecked((prev) => applyOptionSelection(prev, id, !prev[id]));
  }, []);

  function handleOpenEditManejo(report: ManejoReport) {
    setEditingManejo(report);
    setEditManejoObs(report.observacoes);
    setEditManejoInd(report.indicacoes);
    setEditManejoPhotoUri(report.photoUri);
    // Todas as tarefas aparecem no formulário; as do manejo vêm marcadas.
    const tasks: Record<string, EditableManejoTask> = {};
    for (const id of Object.keys(MANEJO_OPTION_LABELS)) tasks[id] = { id, obs: '', ind: '', active: false, customName: '' };
    for (const task of report.checkedOptions) tasks[task.id] = { ...task, active: true };
    setEditManejoTasks(tasks);
  }

  async function handleTakeManejoPhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Erro', 'Permissão para usar a câmera é necessária!');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setEditManejoPhotoUri(result.assets[0].uri);
    }
  }

  async function handleSaveEditManejo() {
    if (!editingManejo) return;
    const finalTasks = Object.values(editManejoTasks)
      .filter((task) => task.active)
      .map(({ id, obs, ind, customName }) => ({ id, obs, ind, ...(id === 'outro' ? { customName } : {}) }));

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
    setEditManejoTasks((prev) => ({ ...prev, [id]: { ...prev[id], active: !prev[id].active } }));
  };

  const updateEditManejoTaskDetail = (id: string, field: 'obs' | 'ind' | 'customName', value: string) => {
    setEditManejoTasks((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

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

  /** Comando de voz "observações"/"o que fazer": rola o formulário aberto até as anotações. */
  function scrollEditorToNotes() {
    if (editingReport) editRevisionScrollRef.current?.scrollToEnd({ animated: true });
    if (editingManejo) editManejoScrollRef.current?.scrollToEnd({ animated: true });
  }

  /** Comando de voz "encerrar": fecha os formulários sem salvar. */
  function closeEditors() {
    setEditingReport(null);
    setEditingManejo(null);
  }

  return {
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
    editRevisionScrollRef,
    editManejoScrollRef,
    handleOpenEditReport,
    handleSaveEditReport,
    toggleEditOption,
    handleOpenEditManejo,
    handleTakeManejoPhoto,
    handleSaveEditManejo,
    toggleEditManejoTask,
    updateEditManejoTaskDetail,
    handleDeleteReport: (id: number) => setDeleteId(id),
    confirmDeleteReport,
    handleDeleteManejo: (id: number) => setDeleteManejoId(id),
    confirmDeleteManejo,
    scrollEditorToNotes,
    closeEditors,
  };
}
