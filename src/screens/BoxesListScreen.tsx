import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { AppHeader } from '../components/AppHeader';
import { BottomDock } from '../components/BottomDock';
import { ConfirmModal } from '../components/ConfirmModal';
import { useBoxesList } from '../hooks/useBoxesList';
import { createStyles } from './styles/BoxesListScreen.styles';
import type { RootStackParamList } from '../types/auth';
import { OPTION_LABELS } from '../types/reviewReport';
import { MANEJO_OPTION_LABELS } from '../types/manejo';
import { ActionButtonsBar } from '../components/ActionButtonsBar';

type Props = NativeStackScreenProps<RootStackParamList, 'BoxesList'>;

export function BoxesListScreen({ navigation, route }: Props) {
  const hook = useBoxesList(navigation, route.params);
  const styles = createStyles(hook.colors);

  const {
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
  } = hook;

  return (
    <View style={styles.safeArea}>
      <AppHeader
        title={mode === 'manejo' ? 'Manejos' : selectedApiaryId ? 'Caixas' : 'Caixas do Apiário'}
        showBack
        onPressBack={() => navigation.goBack()}
        onPressBell={() => navigation.navigate('Notifications')}
        showMic={true}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar caixa por nome..."
          placeholderTextColor={colors.textMuted}
        />

        {apiarySections.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="cube-outline" size={42} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Nenhuma caixa encontrada</Text>
            <Text style={styles.emptySubtitle}>
              {selectedApiaryId && role !== 'reader'
                ? 'Toque em "Adicionar Caixa" para cadastrar a primeira caixa.'
                : 'Nenhum apiário ou caixa cadastrada.'}
            </Text>
          </View>
        ) : null}

        {apiarySections.map((section) => (
          <View key={`apiary-sec-${section.apiaryId}`} style={styles.sectionContainer}>
            {/* Header da Seção do Apiário */}
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleArea}>
                <View style={styles.sectionIconBadge}>
                  <MaterialCommunityIcons name="beehive-outline" size={22} color={colors.accent} />
                </View>
                <Text style={styles.sectionApiaryName}>{section.apiaryName}</Text>
                <View style={styles.sectionCountBadge}>
                  <Text style={styles.sectionCountText}>
                    {section.boxes.length === 1 ? '1 caixa' : `${section.boxes.length} caixas`}
                  </Text>
                </View>
                {section.lastModifiedTime > 0 ? (
                  <View style={styles.sectionUpdatedBadge}>
                    <Ionicons name="sparkles" size={10} color="#059669" />
                    <Text style={styles.sectionUpdatedBadgeText}>Recente</Text>
                  </View>
                ) : null}
              </View>

              {section.role !== 'reader' ? (
                <Pressable
                  style={styles.sectionAddBtn}
                  onPress={() => handleOpenAddBox(section.apiaryId, section.apiaryName)}
                >
                  <Ionicons name="add" size={15} color="#FFFFFF" />
                  <Text style={styles.sectionAddBtnText}>Caixa</Text>
                </Pressable>
              ) : null}
            </View>

            {/* Caixas do Apiário */}
            {section.boxes.length === 0 ? (
              <View style={styles.sectionEmptyBox}>
                <Text style={styles.sectionEmptyText}>Nenhuma caixa cadastrada neste apiário.</Text>
              </View>
            ) : (
              <View style={styles.sectionBoxesList}>
                {section.boxes.map((box) => (
                  <View key={box.id} style={[styles.boxCard, box.isHandled ? styles.boxCardHandled : null]}>
                    <View style={styles.boxCardHeader}>
                      <View style={styles.boxTitleArea}>
                        <View style={[styles.boxIconWrap, box.isHandled ? styles.boxIconWrapHandled : null]}>
                          <Ionicons
                            name="cube"
                            size={20}
                            color={box.isHandled ? '#059669' : colors.headerBackground}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Text style={styles.boxName}>{box.name}</Text>
                            {box.isHandled ? (
                              <View style={styles.handledBadge}>
                                <Ionicons name="sparkles" size={11} color="#059669" />
                                <Text style={styles.handledBadgeText}>
                                  {box.modificationType === 'manejo'
                                    ? 'Manejo recente'
                                    : box.modificationType === 'revisao'
                                    ? 'Revisada recente'
                                    : 'Atualizada recentemente'}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
                      </View>

                      <View style={styles.headerButtons}>
                        <Pressable
                          style={styles.iconBtn}
                          onPress={() => handleOpenAnnotations(box)}
                        >
                          <Ionicons name="time-outline" size={20} color={colors.accent} />
                        </Pressable>
                        {section.role !== 'reader' && (
                          <>
                            <Pressable
                              style={styles.iconBtn}
                              onPress={() => handleOpenRename(box)}
                            >
                              <Ionicons name="pencil-outline" size={20} color={colors.textMuted} />
                            </Pressable>
                            <Pressable
                              style={styles.iconBtn}
                              onPress={() => setDeleteBoxId(box.rawId)}
                            >
                              <Ionicons name="trash-outline" size={18} color={colors.error} />
                            </Pressable>
                          </>
                        )}
                      </View>
                    </View>

                    <View style={styles.cardBottomActions}>
                      <Pressable
                        style={[styles.mainActionBtn, { backgroundColor: colors.headerBackground }]}
                        onPress={() => {
                          navigation.navigate('BoxRevision', {
                            boxId: box.rawId,
                            boxName: box.name,
                            apiaryName: box.apiaryName,
                            apiaryId: box.apiaryId || null,
                            tipo: 'apiario',
                          });
                        }}
                      >
                        <Ionicons name="clipboard-outline" size={16} color="#FFFFFF" />
                        <Text style={styles.mainActionBtnText}>Nova Revisão</Text>
                      </Pressable>

                      <Pressable
                        style={[styles.mainActionBtn, { backgroundColor: colors.warmAccent }]}
                        onPress={() => {
                          navigation.navigate('BoxManejo', {
                            boxId: box.rawId,
                            boxName: box.name,
                            apiaryName: box.apiaryName,
                            apiaryId: box.apiaryId || null,
                            tipo: 'apiario',
                          });
                        }}
                      >
                        <Ionicons name="construct-outline" size={16} color="#FFFFFF" />
                        <Text style={styles.mainActionBtnText}>Novo Manejo</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Modal de Renomear */}
      <Modal visible={renameVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Renomear Caixa</Text>
            <TextInput
              style={styles.modalInput}
              value={renameValue}
              onChangeText={setRenameValue}
              placeholder="Novo nome da caixa"
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setRenameVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={handleSaveRename}
              >
                <Text style={styles.saveBtnText}>Salvar</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal de Histórico/Anotações */}
      <Modal visible={annotationsModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%', width: '92%' }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Histórico • {selectedBoxForAnnotations?.name}</Text>
              <Pressable onPress={() => setAnnotationsModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {allRevisions
                .filter((r) => r.caixaId === selectedBoxForAnnotations?.rawId)
                .map((rev) => (
                  <Pressable
                    key={`rev-${rev.id}`}
                    style={styles.historyItem}
                    onPress={() => {
                      setAnnotationsModalVisible(false);
                      navigation.navigate('EditReportNotes', { report: rev });
                    }}
                  >
                    <View style={styles.historyHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.historyTag}>Revisão</Text>
                        <Ionicons name="chevron-forward" size={13} color={colors.textMuted} />
                      </View>
                      <Text style={styles.historyDate}>{new Date(rev.createdAt).toLocaleDateString('pt-BR')}</Text>
                    </View>
                    {rev.observacoes ? <Text style={styles.historyText}>{rev.observacoes}</Text> : null}
                    {rev.indicacoes ? <Text style={[styles.historyText, { color: '#065F46' }]}>Recomendação: {rev.indicacoes}</Text> : null}
                  </Pressable>
                ))}

              {allManejos
                .filter((m) => m.caixaId === selectedBoxForAnnotations?.rawId)
                .map((man) => (
                  <Pressable
                    key={`man-${man.id}`}
                    style={styles.historyItem}
                    onPress={() => {
                      setAnnotationsModalVisible(false);
                      navigation.navigate('EditManejoNotes', { manejo: man });
                    }}
                  >
                    <View style={styles.historyHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.historyTag, { backgroundColor: colors.accentSoft, color: colors.accent }]}>Manejo</Text>
                        <Ionicons name="chevron-forward" size={13} color={colors.textMuted} />
                      </View>
                      <Text style={styles.historyDate}>{new Date(man.createdAt).toLocaleDateString('pt-BR')}</Text>
                    </View>
                    {man.observacoes ? <Text style={styles.historyText}>{man.observacoes}</Text> : null}
                    {man.indicacoes ? <Text style={[styles.historyText, { color: '#065F46' }]}>Próximo passo: {man.indicacoes}</Text> : null}
                  </Pressable>
                ))}

              {allRevisions.filter((r) => r.caixaId === selectedBoxForAnnotations?.rawId).length === 0 &&
              allManejos.filter((m) => m.caixaId === selectedBoxForAnnotations?.rawId).length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 24, gap: 8 }}>
                  <Ionicons name="time-outline" size={36} color={colors.textMuted} />
                  <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center' }}>
                    Nenhuma anotação registrada ainda para esta caixa.
                  </Text>
                </View>
              ) : null}
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.cardBorder }}>
              <Pressable
                style={[styles.mainActionBtn, { flex: 1, backgroundColor: colors.headerBackground, paddingVertical: 10 }]}
                onPress={() => {
                  setAnnotationsModalVisible(false);
                  navigation.navigate('ReviewReportsList', {
                    tipo: 'apiario',
                    apiaryId: selectedBoxForAnnotations?.apiaryId || route.params?.apiaryId,
                    apiaryName: selectedBoxForAnnotations?.apiaryName || route.params?.apiaryName,
                    initialTab: 'revisoes',
                  });
                }}
              >
                <Ionicons name="clipboard-outline" size={15} color="#FFFFFF" />
                <Text style={[styles.mainActionBtnText, { fontSize: 12 }]}>Histórico Revisões</Text>
              </Pressable>

              <Pressable
                style={[styles.mainActionBtn, { flex: 1, backgroundColor: colors.warmAccent, paddingVertical: 10 }]}
                onPress={() => {
                  setAnnotationsModalVisible(false);
                  navigation.navigate('ReviewReportsList', {
                    tipo: 'apiario',
                    apiaryId: selectedBoxForAnnotations?.apiaryId || route.params?.apiaryId,
                    apiaryName: selectedBoxForAnnotations?.apiaryName || route.params?.apiaryName,
                    initialTab: 'manejos',
                  });
                }}
              >
                <Ionicons name="construct-outline" size={15} color="#FFFFFF" />
                <Text style={[styles.mainActionBtnText, { fontSize: 12 }]}>Histórico Manejos</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Adicionar Nova Caixa */}
      <Modal visible={addBoxVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Adicionar Nova Caixa</Text>
            {targetAddApiary?.name ? (
              <Text style={{ color: colors.headerBackground, fontSize: 13, fontWeight: '700', marginBottom: 12 }}>
                Apiário: {targetAddApiary.name}
              </Text>
            ) : null}
            <TextInput
              style={styles.modalInput}
              value={newBoxName}
              onChangeText={setNewBoxName}
              placeholder="Nome da caixa (ex: Caixa 06)"
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setAddBoxVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={handleSaveAddBox}
                disabled={addingBox}
              >
                <Text style={styles.saveBtnText}>{addingBox ? 'Salvando...' : 'Adicionar'}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal de Confirmação de Exclusão de Caixa */}
      <ConfirmModal
        visible={Boolean(deleteBoxId)}
        title="Excluir Caixa"
        message="Tem certeza que deseja excluir esta caixa? Todas as revisões e manejos associados a ela serão apagados."
        confirmLabel="Sim, Excluir"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteBoxId(null)}
      />

      <BottomDock
        active={null}
        onPressHome={() => navigation.navigate('Home')}
        onPressSettings={() => navigation.replace('Settings')}
      />
    </View>
  );
}
