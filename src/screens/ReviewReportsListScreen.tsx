import { useState, useCallback } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { loadApiary } from '../services/apiaryService';

import { AppHeader } from '../components/AppHeader';
import { BottomDock } from '../components/BottomDock';
import { ConfirmModal } from '../components/ConfirmModal';
import { ReportCard } from '../components/ReportCard';
import { useReviewReportsList } from '../hooks/useReviewReportsList';
import { createStyles } from './styles/ReviewReportsListScreen.styles';

export function ReviewReportsListScreen({ navigation, route }: { navigation: any; route: any }) {
  const reportsListHook = useReviewReportsList(route.params);
  const styles = createStyles(reportsListHook.colors);
  
  const [role, setRole] = useState<'reader' | 'editor' | 'owner'>('owner');

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      async function loadRole() {
        if (route.params?.apiaryId) {
          try {
            const apiary = await loadApiary(Number(route.params.apiaryId));
            if (mounted) {
              setRole(apiary?.role || 'owner');
            }
          } catch (err) {
            console.error('Error loading role in ReviewReportsListScreen:', err);
            if (mounted) setRole('owner');
          }
        } else {
          if (mounted) setRole('owner');
        }
      }
      loadRole();
      return () => {
        mounted = false;
      };
    }, [route.params?.apiaryId])
  );

  const {
    colors,
    searchTerm,
    setSearchTerm,
    deleteId,
    setDeleteId,
    deleteManejoId,
    setDeleteManejoId,
    activeTab,
    setActiveTab,
    loading,
    handleDelete,
    confirmDelete,
    handleDeleteManejo,
    confirmDeleteManejo,
    handleArchiveRevisionItem,
    handleArchiveManejoItem,
    groupedReports,
    groupedManejos,
    quickFilter,
    setQuickFilter,
  } = reportsListHook;

  const screenTitle = route.params?.apiaryName ? `Histórico - ${route.params.apiaryName}` : 'Histórico de Atividades';

  return (
    <View style={styles.safeArea}>
      <AppHeader
        title={screenTitle}
        showBack
        onPressBack={() => navigation.goBack()}
        onPressBell={() => navigation.navigate('Notifications')}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Navegação em Abas Segmentadas */}
        <View style={styles.segmentedContainer}>
          <Pressable
            style={[styles.segmentBtn, activeTab === 'revisoes' ? styles.segmentBtnActiveRevisao : null]}
            onPress={() => setActiveTab('revisoes')}
          >
            <Ionicons
              name="clipboard-outline"
              size={18}
              color={activeTab === 'revisoes' ? '#FFFFFF' : colors.textMuted}
            />
            <Text style={[styles.segmentText, activeTab === 'revisoes' ? styles.segmentTextActive : null]}>
              Revisões
            </Text>
          </Pressable>
          <Pressable
            style={[styles.segmentBtn, activeTab === 'manejos' ? styles.segmentBtnActiveManejo : null]}
            onPress={() => setActiveTab('manejos')}
          >
            <Ionicons
              name="construct-outline"
              size={18}
              color={activeTab === 'manejos' ? '#FFFFFF' : colors.textMuted}
            />
            <Text style={[styles.segmentText, activeTab === 'manejos' ? styles.segmentTextActive : null]}>
              Manejos
            </Text>
          </Pressable>
        </View>

        {/* Filtro Rápido de Tempo */}
        <View style={styles.filterRow}>
          <Pressable
            style={[styles.filterPill, quickFilter === 'thisMonth' ? styles.filterPillActive : null]}
            onPress={() => setQuickFilter('thisMonth')}
          >
            <Ionicons name="calendar" size={16} color={quickFilter === 'thisMonth' ? colors.buttonText : colors.accent} />
            <Text style={[styles.filterPillText, quickFilter === 'thisMonth' ? styles.filterPillTextActive : null]}>
              Mês Atual
            </Text>
          </Pressable>

          <Pressable
            style={[styles.filterPill, quickFilter === '7days' ? styles.filterPillActive : null]}
            onPress={() => setQuickFilter('7days')}
          >
            <Ionicons name="time" size={16} color={quickFilter === '7days' ? colors.buttonText : colors.accent} />
            <Text style={[styles.filterPillText, quickFilter === '7days' ? styles.filterPillTextActive : null]}>
              7 Dias
            </Text>
          </Pressable>

          <Pressable
            style={[styles.filterPill, quickFilter === 'all' ? styles.filterPillActive : null]}
            onPress={() => setQuickFilter('all')}
          >
            <Ionicons name="eye" size={16} color={quickFilter === 'all' ? colors.buttonText : colors.accent} />
            <Text style={[styles.filterPillText, quickFilter === 'all' ? styles.filterPillTextActive : null]}>
              Ver Tudo
            </Text>
          </Pressable>
        </View>

        {/* Campo de Busca */}
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por caixa ou palavra..."
            placeholderTextColor={colors.textMuted}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          {searchTerm ? (
            <Pressable onPress={() => setSearchTerm('')} hitSlop={10}>
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        {loading && <ActivityIndicator size="large" color={colors.accent} style={{ marginVertical: 30 }} />}

        {!loading && activeTab === 'revisoes' && (
          groupedReports.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="clipboard-outline" size={44} color={colors.textMuted} style={{ marginBottom: 8 }} />
              <Text style={styles.emptyTitle}>Nenhuma revisão encontrada</Text>
              <Text style={styles.emptySubtitle}>Não há revisões registradas para os filtros selecionados.</Text>
            </View>
          ) : (
            groupedReports.map(([apiaryName, reportsList]) => (
              <ReportCard
                key={`revisao-${apiaryName}`}
                apiaryName={apiaryName}
                reports={reportsList}
                type="revisao"
                onEdit={role === 'reader' ? undefined : (r) => navigation.navigate('EditReportNotes', { report: r })}
                onDelete={role === 'reader' ? undefined : (r) => handleDelete(r.id)}
              />
            ))
          )
        )}

        {!loading && activeTab === 'manejos' && (
          groupedManejos.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="construct-outline" size={44} color={colors.textMuted} style={{ marginBottom: 8 }} />
              <Text style={styles.emptyTitle}>Nenhum manejo encontrado</Text>
              <Text style={styles.emptySubtitle}>Não há manejos registrados para os filtros selecionados.</Text>
            </View>
          ) : (
            groupedManejos.map(([apiaryName, reportsList]) => (
              <ReportCard
                key={`manejo-${apiaryName}`}
                apiaryName={apiaryName}
                reports={reportsList}
                type="manejo"
                onEdit={role === 'reader' ? undefined : (r) => navigation.navigate('EditManejoNotes', { manejo: r })}
                onDelete={role === 'reader' ? undefined : (r) => handleDeleteManejo(r.id!)}
              />
            ))
          )
        )}
      </ScrollView>

      {/* Delete confirmation modals */}
      <ConfirmModal
        visible={!!deleteId}
        title="Excluir Revisão"
        message="Tem certeza que deseja excluir esta revisão? Esta ação não pode ser desfeita."
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteId(null)}
      />

      <ConfirmModal
        visible={!!deleteManejoId}
        title="Excluir Manejo"
        message="Tem certeza que deseja excluir este manejo? Esta ação não pode ser desfeita."
        onConfirm={() => void confirmDeleteManejo()}
        onCancel={() => setDeleteManejoId(null)}
      />

      <BottomDock
        active={null}
        onPressHome={() => navigation.replace('Home')}
        onPressSettings={() => navigation.replace('Settings')}
      />
    </View>
  );
}

const commonStylesLoader = {
  marginVertical: 24,
};
