import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppHeader } from '../components/AppHeader';
import { ConfirmModal } from '../components/ConfirmModal';
import { BottomDock } from '../components/BottomDock';
import { ReportCard } from '../components/ReportCard';
import { useReports } from '../hooks/useReports';
import { createStyles } from './styles/ReportsScreen.styles';

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

  return (
    <View style={styles.safeArea}>
      <AppHeader
        title={screenTitle.toUpperCase()}
        showBack
        onPressBack={() => navigation.goBack()}
        onPressBell={() => navigation.navigate('Notifications')}
      />

      <FlatList
        data={groupedApiaryItems}
        keyExtractor={(item, index) => `${filter}-${item.apiaryName || index}`}
        ListHeaderComponent={
          <View style={{ gap: 12 }}>
            {/* Navegação em Abas Segmentadas */}
            <View style={styles.segmentedContainer}>
              <Pressable
                style={[styles.segmentBtn, filter === 'revisoes' ? styles.segmentBtnActiveRevisao : null]}
                onPress={() => setFilter('revisoes')}
              >
                <Ionicons
                  name="clipboard-outline"
                  size={17}
                  color={filter === 'revisoes' ? '#FFFFFF' : colors.textMuted}
                />
                <Text style={[styles.segmentText, filter === 'revisoes' ? styles.segmentTextActive : null]}>
                  Revisões
                </Text>
              </Pressable>

              <Pressable
                style={[styles.segmentBtn, filter === 'manejos' ? styles.segmentBtnActiveManejo : null]}
                onPress={() => setFilter('manejos')}
              >
                <Ionicons
                  name="construct-outline"
                  size={17}
                  color={filter === 'manejos' ? '#FFFFFF' : colors.textMuted}
                />
                <Text style={[styles.segmentText, filter === 'manejos' ? styles.segmentTextActive : null]}>
                  Manejos
                </Text>
              </Pressable>
            </View>

            {/* Filtros Rápidos (Chips) - Começando com 7 Dias como padrão */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsRow}>
              <Pressable
                style={[styles.filterChip, quickFilter === '7days' ? styles.filterChipActive : null]}
                onPress={() => setQuickFilter('7days')}
              >
                <Ionicons 
                  name="time-outline" 
                  size={15} 
                  color={quickFilter === '7days' ? (colors.buttonText || '#FFFFFF') : colors.accent} 
                />
                <Text style={[styles.filterChipText, quickFilter === '7days' ? styles.filterChipTextActive : null]}>
                  7 Dias
                </Text>
              </Pressable>

              <Pressable
                style={[styles.filterChip, quickFilter === 'thisMonth' ? styles.filterChipActive : null]}
                onPress={() => setQuickFilter('thisMonth')}
              >
                <Ionicons 
                  name="calendar-outline" 
                  size={15} 
                  color={quickFilter === 'thisMonth' ? (colors.buttonText || '#FFFFFF') : colors.accent} 
                />
                <Text style={[styles.filterChipText, quickFilter === 'thisMonth' ? styles.filterChipTextActive : null]}>
                  Mês Atual
                </Text>
              </Pressable>

              <Pressable
                style={[styles.filterChip, quickFilter === 'apiary' ? styles.filterChipActive : null]}
                onPress={() => setQuickFilter('apiary')}
              >
                <Ionicons 
                  name="location-outline" 
                  size={15} 
                  color={quickFilter === 'apiary' ? (colors.buttonText || '#FFFFFF') : colors.accent} 
                />
                <Text style={[styles.filterChipText, quickFilter === 'apiary' ? styles.filterChipTextActive : null]}>
                  Por Apiário
                </Text>
              </Pressable>

              <Pressable
                style={[styles.filterChip, quickFilter === 'all' ? styles.filterChipActive : null]}
                onPress={() => setQuickFilter('all')}
              >
                <Ionicons 
                  name="grid-outline" 
                  size={15} 
                  color={quickFilter === 'all' ? (colors.buttonText || '#FFFFFF') : colors.accent} 
                />
                <Text style={[styles.filterChipText, quickFilter === 'all' ? styles.filterChipTextActive : null]}>
                  Ver Tudo
                </Text>
              </Pressable>
            </ScrollView>

            {/* Busca */}
            <View style={styles.searchContainerFull}>
              <Ionicons name="search-outline" size={18} color={colors.textMuted} />
              <TextInput
                style={styles.searchInputFull}
                placeholder="Buscar por caixa ou palavra..."
                placeholderTextColor={colors.textMuted}
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
              {searchTerm ? (
                <Pressable onPress={() => setSearchTerm('')} hitSlop={10}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
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
              <Ionicons 
                name={filter === 'revisoes' ? 'clipboard-outline' : 'construct-outline'} 
                size={40} 
                color={colors.textMuted} 
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

      <BottomDock
        active={null}
        onPressHome={() => navigation.replace('Home')}
        onPressSettings={() => navigation.replace('Settings')}
      />
    </View>
  );
}
