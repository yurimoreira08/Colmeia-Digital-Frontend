import { useState, useCallback } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { loadApiary } from '../services/apiaryService';

import { AppHeader } from '../components/AppHeader';
import { BottomDock } from '../components/BottomDock';
import { ConfirmModal } from '../components/ConfirmModal';
import { ReportCard } from '../components/ReportCard';
import { ExportPdfModal } from '../components/ExportPdfModal';
import { useReviewReportsList } from '../hooks/useReviewReportsList';
import { createStyles } from './styles/ReviewReportsListScreen.styles';
import { PALETTE } from '../theme/themes';

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

  const [exportModalVisible, setExportModalVisible] = useState(false);
  const screenTitle = route.params?.apiaryName ? `Histórico - ${route.params.apiaryName}` : 'Histórico de Atividades';

  return (
    <View style={styles.safeArea}>
      <AppHeader
        title={screenTitle}
        showBack
        onPressBack={() => navigation.goBack()}
        onPressBell={() => navigation.navigate('Notifications')}
        rightElement={
          <Pressable
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 8,
              backgroundColor: '#FEF2F2',
              borderWidth: 1,
              borderColor: '#FCA5A5',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              marginLeft: 6,
            }}
            onPress={() => setExportModalVisible(true)}
            hitSlop={8}
            accessibilityLabel="Exportar histórico em PDF"
          >
            <MaterialCommunityIcons name="file-pdf-box" size={20} color="#DC2626" />
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#DC2626' }}>PDF</Text>
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Navegação em Abas Segmentadas */}
        <View style={styles.segmentedContainer}>
          <Pressable
            style={[styles.segmentBtn, activeTab === 'revisoes' ? styles.segmentBtnActiveRevisao : null]}
            onPress={() => setActiveTab('revisoes')}
          >
            <MaterialCommunityIcons
              name="clipboard-text-outline"
              size={20}
              color={activeTab === 'revisoes' ? '#FFFFFF' : PALETTE.secondaryDark}
            />
            <Text style={[styles.segmentText, activeTab === 'revisoes' ? styles.segmentTextActive : null]}>
              Revisões
            </Text>
          </Pressable>
          <Pressable
            style={[styles.segmentBtn, activeTab === 'manejos' ? styles.segmentBtnActiveManejo : null]}
            onPress={() => setActiveTab('manejos')}
          >
            <MaterialCommunityIcons
              name="tools"
              size={20}
              color={activeTab === 'manejos' ? '#FFFFFF' : PALETTE.secondaryDark}
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
            <MaterialCommunityIcons
              name="calendar-month-outline"
              size={18}
              color={quickFilter === 'thisMonth' ? '#FFFFFF' : PALETTE.primaryDark}
            />
            <Text style={[styles.filterPillText, quickFilter === 'thisMonth' ? styles.filterPillTextActive : null]}>
              Mês Atual
            </Text>
          </Pressable>

          <Pressable
            style={[styles.filterPill, quickFilter === '7days' ? styles.filterPillActive : null]}
            onPress={() => setQuickFilter('7days')}
          >
            <MaterialCommunityIcons
              name="clock-outline"
              size={18}
              color={quickFilter === '7days' ? '#FFFFFF' : PALETTE.primaryDark}
            />
            <Text style={[styles.filterPillText, quickFilter === '7days' ? styles.filterPillTextActive : null]}>
              7 Dias
            </Text>
          </Pressable>

          <Pressable
            style={[styles.filterPill, quickFilter === 'all' ? styles.filterPillActive : null]}
            onPress={() => setQuickFilter('all')}
          >
            <MaterialCommunityIcons
              name="view-grid-outline"
              size={18}
              color={quickFilter === 'all' ? '#FFFFFF' : PALETTE.primaryDark}
            />
            <Text style={[styles.filterPillText, quickFilter === 'all' ? styles.filterPillTextActive : null]}>
              Ver Tudo
            </Text>
          </Pressable>
        </View>

        {/* Campo de Busca */}
        <View style={styles.searchWrap}>
          <MaterialCommunityIcons name="magnify" size={22} color={PALETTE.secondaryDark} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por caixa ou palavra..."
            placeholderTextColor={PALETTE.secondaryDark}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          {searchTerm ? (
            <Pressable onPress={() => setSearchTerm('')} hitSlop={10}>
              <MaterialCommunityIcons name="close-circle" size={20} color={PALETTE.secondaryDark} />
            </Pressable>
          ) : null}
        </View>

        {loading && <ActivityIndicator size="large" color={PALETTE.primaryDark} style={{ marginVertical: 30 }} />}

        {!loading && activeTab === 'revisoes' && (
          groupedReports.length === 0 ? (
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name="clipboard-text-outline" size={44} color={PALETTE.secondaryDark} style={{ marginBottom: 8 }} />
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
              <MaterialCommunityIcons name="tools" size={44} color={PALETTE.secondaryDark} style={{ marginBottom: 8 }} />
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

      <ExportPdfModal
        visible={exportModalVisible}
        onClose={() => setExportModalVisible(false)}
        targetTitle={route.params?.boxName ? `Caixa ${route.params.boxName}` : (route.params?.apiaryName || 'Histórico')}
        targetSubtitle={route.params?.apiaryName ? `Apiário: ${route.params.apiaryName}` : undefined}
        apiaryId={route.params?.apiaryId ? Number(route.params.apiaryId) : undefined}
        caixaId={route.params?.boxId ? Number(route.params.boxId) : undefined}
        boxName={route.params?.boxName}
      />

      <BottomDock
        active={null}
        onPressHome={() => navigation.replace('Home')}
        onPressSettings={() => navigation.replace('Settings')}
      />
    </View>
  );
}
