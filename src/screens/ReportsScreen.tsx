import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View, FlatList } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { AppHeader } from '../components/AppHeader';
import { ConfirmModal } from '../components/ConfirmModal';
import { BottomDock } from '../components/BottomDock';
import { ReportCard } from '../components/ReportCard';
import { ExportPdfModal } from '../components/ExportPdfModal';
import { useReports } from '../hooks/useReports';
import { createStyles } from './styles/ReportsScreen.styles';
import { PALETTE } from '../theme/themes';

export function ReportsScreen({ navigation, route }: { navigation: any; route: any }) {
  const reportsHook = useReports(route.params);
  const styles = createStyles(reportsHook.colors);

  const {
    colors,
    filter,
    setFilter,
    loading,
    searchTerm,
    setSearchTerm,
    apiaries,
    paginatedItems,
    loadMore,
    quickFilter,
    setQuickFilter,
    selectedApiaryId,
    setSelectedApiaryId,
    selectedBoxId,
    barsData,
    maxBar,
    summaryText,
    chartTitle,

    deleteId,
    setDeleteId,
    deleteManejoId,
    setDeleteManejoId,

    handleDeleteReport,
    confirmDeleteReport,
    handleDeleteManejo,
    confirmDeleteManejo,
  } = reportsHook;

  const screenTitle = route.params?.title || (route.name === 'ReviewReportsList' ? 'Anotações' : 'Relatórios');

  const groupedApiaryItems = useMemo(() => {
    if (filter === 'revisoes' || filter === 'manejos') {
      const groups: { apiaryName: string; apiaryId?: number; reports: any[] }[] = [];
      paginatedItems.forEach((item) => {
        const name = item.apiaryName || 'APIÁRIO GERAL';
        let group = groups.find((g) => g.apiaryName.toLowerCase() === name.toLowerCase());
        if (!group) {
          group = { apiaryName: name, apiaryId: item.apiaryId || item.apiary_id, reports: [] };
          groups.push(group);
        }
        group.reports.push(item);
      });
      return groups;
    }
    return [];
  }, [paginatedItems, filter]);

  const [exportModalVisible, setExportModalVisible] = useState(false);

  return (
    <View style={styles.safeArea}>
      <AppHeader
        title={screenTitle.toUpperCase()}
        showBack
        showMic={true}
        onPressBack={() => navigation.goBack()}
        onPressBell={() => navigation.navigate('Notifications')}
        rightElement={
          <Pressable
            accessibilityRole="button"
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
            accessibilityLabel="Exportar relatório em PDF"
          >
            <MaterialCommunityIcons name="file-pdf-box" size={20} color="#DC2626" />
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#DC2626' }}>PDF</Text>
          </Pressable>
        }
      />

      <FlatList
        data={groupedApiaryItems}
        keyExtractor={(item, index) => `${filter}-${item.apiaryName || index}`}
        ListHeaderComponent={
          <View style={{ gap: 12 }}>
            {/* Navegação em Abas Segmentadas */}
            <View style={styles.segmentedContainer}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: filter === 'revisoes' }}
                style={[styles.segmentBtn, filter === 'revisoes' ? styles.segmentBtnActiveRevisao : null]}
                onPress={() => setFilter('revisoes')}
              >
                <MaterialCommunityIcons
                  name="clipboard-text-outline"
                  size={19}
                  color={filter === 'revisoes' ? '#FFFFFF' : PALETTE.secondaryDark}
                />
                <Text style={[styles.segmentText, filter === 'revisoes' ? styles.segmentTextActive : null]}>
                  Revisões
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: filter === 'manejos' }}
                style={[styles.segmentBtn, filter === 'manejos' ? styles.segmentBtnActiveManejo : null]}
                onPress={() => setFilter('manejos')}
              >
                <MaterialCommunityIcons
                  name="tools"
                  size={19}
                  color={filter === 'manejos' ? '#FFFFFF' : PALETTE.secondaryDark}
                />
                <Text style={[styles.segmentText, filter === 'manejos' ? styles.segmentTextActive : null]}>
                  Manejos
                </Text>
              </Pressable>
            </View>

            {/* Filtros Rápidos (Chips) */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: quickFilter === '7days' }}
                style={[styles.filterChip, quickFilter === '7days' ? styles.filterChipActive : null]}
                onPress={() => setQuickFilter('7days')}
              >
                <MaterialCommunityIcons 
                  name="clock-outline" 
                  size={16} 
                  color={quickFilter === '7days' ? '#FFFFFF' : PALETTE.primaryDark} 
                />
                <Text style={[styles.filterChipText, quickFilter === '7days' ? styles.filterChipTextActive : null]}>
                  7 Dias
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: quickFilter === 'thisMonth' }}
                style={[styles.filterChip, quickFilter === 'thisMonth' ? styles.filterChipActive : null]}
                onPress={() => setQuickFilter('thisMonth')}
              >
                <MaterialCommunityIcons 
                  name="calendar-month-outline" 
                  size={16} 
                  color={quickFilter === 'thisMonth' ? '#FFFFFF' : PALETTE.primaryDark} 
                />
                <Text style={[styles.filterChipText, quickFilter === 'thisMonth' ? styles.filterChipTextActive : null]}>
                  Mês Atual
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: quickFilter === 'apiary' }}
                style={[styles.filterChip, quickFilter === 'apiary' ? styles.filterChipActive : null]}
                onPress={() => setQuickFilter('apiary')}
              >
                <MaterialCommunityIcons 
                  name="map-marker-outline" 
                  size={16} 
                  color={quickFilter === 'apiary' ? '#FFFFFF' : PALETTE.primaryDark} 
                />
                <Text style={[styles.filterChipText, quickFilter === 'apiary' ? styles.filterChipTextActive : null]}>
                  Por Apiário
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: quickFilter === 'all' }}
                style={[styles.filterChip, quickFilter === 'all' ? styles.filterChipActive : null]}
                onPress={() => setQuickFilter('all')}
              >
                <MaterialCommunityIcons 
                  name="view-grid-outline" 
                  size={16} 
                  color={quickFilter === 'all' ? '#FFFFFF' : PALETTE.primaryDark} 
                />
                <Text style={[styles.filterChipText, quickFilter === 'all' ? styles.filterChipTextActive : null]}>
                  Ver Tudo
                </Text>
              </Pressable>
            </ScrollView>

            {/* Busca */}
            <View style={styles.searchContainerFull}>
              <MaterialCommunityIcons name="magnify" size={22} color={PALETTE.secondaryDark} />
              <TextInput
                style={styles.searchInputFull}
                placeholder="Buscar por caixa ou palavra..."
                placeholderTextColor={PALETTE.secondaryDark}
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
              {searchTerm ? (
                <Pressable accessibilityRole="button" accessibilityLabel="Limpar busca" onPress={() => setSearchTerm('')} hitSlop={10}>
                  <MaterialCommunityIcons name="close-circle" size={20} color={PALETTE.secondaryDark} />
                </Pressable>
              ) : null}
            </View>

            {/* Seletor de Apiário (quando o filtro 'Por Apiário' estiver selecionado) */}
            {quickFilter === 'apiary' && (filter === 'revisoes' || filter === 'manejos') && (
              <View style={styles.pickerSection}>
                <Text style={styles.pickerSectionLabel}>Selecione o Apiário:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerItemRow}>
                  {apiaries.map((apiary) => (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: selectedApiaryId === apiary.id }}
                      key={apiary.id}
                      style={[styles.pickerItemButton, selectedApiaryId === apiary.id ? styles.pickerItemButtonActive : null]}
                      onPress={() => setSelectedApiaryId(apiary.id === selectedApiaryId ? null : apiary.id)}
                    >
                      <Text style={[styles.pickerItemText, selectedApiaryId === apiary.id ? styles.pickerItemTextActive : null]}>
                        {apiary.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Resumo e Gráficos */}
            {filter === 'apiarios' && (
              <>
                <View style={styles.summaryCard}>
                  <Text style={styles.cardTitle}>Resumo Geral</Text>
                  {loading ? <ActivityIndicator color={colors.textPrimary} /> : <Text style={styles.summaryText}>{summaryText}</Text>}
                </View>

                <View style={styles.chartCard}>
                  <Text style={styles.cardTitle}>{chartTitle}</Text>
                  <View style={styles.chartGrid}>
                    {barsData.map((bar: { label: string; value: number }) => (
                      <View key={bar.label} style={styles.barGroup}>
                        <View
                          style={[
                            styles.bar,
                            {
                              height: `${Math.max((bar.value / maxBar) * 100, 6)}%`,
                            },
                          ]}
                        />
                        <Text style={styles.barLabel}>{bar.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </>
            )}

            {filter === 'caixas' && <Text style={styles.cardTitle}>Relatórios por Caixa</Text>}
          </View>
        }
        contentContainerStyle={styles.content}
        renderItem={({ item }) => {
          const cardType = filter === 'revisoes' ? 'revisao' : 'manejo';

          return (
            <ReportCard
              apiaryName={item.apiaryName}
              reports={item.reports}
              type={cardType}
              onEdit={reportsHook.getRoleForApiary(item.apiaryId) === 'reader' ? undefined : (r) => {
                if (cardType === 'revisao') {
                  navigation.navigate('EditReportNotes', { report: r });
                } else if (cardType === 'manejo') {
                  navigation.navigate('EditManejoNotes', { manejo: r });
                }
              }}
              onDelete={reportsHook.getRoleForApiary(item.apiaryId) === 'reader' ? undefined : (r) => {
                if (cardType === 'revisao') {
                  handleDeleteReport(r.id!);
                } else {
                  handleDeleteManejo(r.id!);
                }
              }}
            />
          );
        }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loading && (filter === 'revisoes' || filter === 'manejos') ? (
            <ActivityIndicator size="small" color={colors.accent} style={{ marginVertical: 16 }} />
          ) : null
        }
        ListEmptyComponent={
          !loading && (filter === 'revisoes' || filter === 'manejos' || filter === 'caixas') ? (
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons 
                name={filter === 'revisoes' ? 'clipboard-text-outline' : 'tools'} 
                size={42} 
                color={PALETTE.secondaryDark} 
                style={{ marginBottom: 8 }}
              />
              <Text style={styles.emptyTitle}>
                {((quickFilter === 'apiary' && !selectedApiaryId) || (quickFilter === 'box' && !selectedBoxId))
                  ? 'Selecione o filtro'
                  : 'Nenhum registro encontrado'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {((quickFilter === 'apiary' && !selectedApiaryId) || (quickFilter === 'box' && !selectedBoxId))
                  ? 'Escolha uma opção acima para visualizar os relatórios.'
                  : 'Nenhuma atividade registrada para o período selecionado.'}
              </Text>
            </View>
          ) : null
        }
      />

      {/* Modais de Exclusão */}
      <ConfirmModal
        visible={!!deleteId}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir esta revisão? Esta ação não pode ser desfeita."
        onConfirm={() => void confirmDeleteReport()}
        onCancel={() => setDeleteId(null)}
      />

      <ConfirmModal
        visible={!!deleteManejoId}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir este manejo? Esta ação não pode ser desfeita."
        onConfirm={() => void confirmDeleteManejo()}
        onCancel={() => setDeleteManejoId(null)}
      />

      <ExportPdfModal
        visible={exportModalVisible}
        onClose={() => setExportModalVisible(false)}
        targetTitle={
          selectedApiaryId
            ? (apiaries.find((a) => a.id === selectedApiaryId)?.name || 'Apiário Selecionado')
            : 'Relatório Geral de Atividades'
        }
        targetSubtitle={selectedApiaryId ? 'Todas as caixas deste apiário' : 'Todos os apiários e colmeias'}
        apiaryId={selectedApiaryId || undefined}
        apiaryName={selectedApiaryId ? (apiaries.find((a) => a.id === selectedApiaryId)?.name || undefined) : undefined}
      />

      <BottomDock
        active={null}
        onPressHome={() => navigation.replace('Home')}
        onPressSettings={() => navigation.replace('Settings')}
      />
    </View>
  );
}
