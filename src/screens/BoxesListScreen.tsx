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
import { Ionicons } from '@expo/vector-icons';

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
        {selectedApiaryName ? (
          <View style={styles.apiaryHeaderTag}>
            <Ionicons name="business-outline" size={16} color={colors.headerBackground} />
            <Text style={styles.apiaryTagText}>{selectedApiaryName}</Text>
          </View>
        ) : null}

        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar caixa por nome..."
          placeholderTextColor={colors.textMuted}
        />

        {boxes.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="cube-outline" size={42} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Nenhuma caixa encontrada</Text>
            <Text style={styles.emptySubtitle}>Ajuste a quantidade de caixas no cadastro do apiário.</Text>
          </View>
        ) : null}

        {boxes.map((box) => (
          <View key={box.id} style={[styles.boxCard, box.isHandled ? styles.boxCardHandled : null]}>
            <View style={styles.boxCardHeader}>
              <View style={styles.boxTitleArea}>
                <View style={[styles.boxIconWrap, box.isHandled ? styles.boxIconWrapHandled : null]}>
                  <Ionicons
                    name={box.isHandled ? 'checkmark-circle' : 'cube'}
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
                            ? 'Manejo feito'
                            : box.modificationType === 'revisao'
                            ? 'Revisada'
                            : 'Mexida recentemente'}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.boxApiaryName}>{box.apiaryName}</Text>
                </View>
              </View>

              <View style={styles.headerButtons}>
                <Pressable
                  style={styles.iconBtn}
                  onPress={() => handleOpenAnnotations(box)}
                >
                  <Ionicons name="time-outline" size={20} color={colors.accent} />
                </Pressable>
                {role !== 'reader' && (
                  <Pressable
                    style={styles.iconBtn}
                    onPress={() => handleOpenRename(box)}
                  >
                    <Ionicons name="pencil-outline" size={20} color={colors.textMuted} />
                  </Pressable>
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
                  <View key={`rev-${rev.id}`} style={styles.historyItem}>
                    <View style={styles.historyHeader}>
                      <Text style={styles.historyTag}>Revisão</Text>
                      <Text style={styles.historyDate}>{new Date(rev.createdAt).toLocaleDateString('pt-BR')}</Text>
                    </View>
                    {rev.observacoes ? <Text style={styles.historyText}>{rev.observacoes}</Text> : null}
                    {rev.indicacoes ? <Text style={[styles.historyText, { color: '#065F46' }]}>Recomendação: {rev.indicacoes}</Text> : null}
                  </View>
                ))}

              {allManejos
                .filter((m) => m.caixaId === selectedBoxForAnnotations?.rawId)
                .map((man) => (
                  <View key={`man-${man.id}`} style={styles.historyItem}>
                    <View style={styles.historyHeader}>
                      <Text style={[styles.historyTag, { backgroundColor: colors.accentSoft, color: colors.accent }]}>Manejo</Text>
                      <Text style={styles.historyDate}>{new Date(man.createdAt).toLocaleDateString('pt-BR')}</Text>
                    </View>
                    {man.observacoes ? <Text style={styles.historyText}>{man.observacoes}</Text> : null}
                    {man.indicacoes ? <Text style={[styles.historyText, { color: '#065F46' }]}>Próximo passo: {man.indicacoes}</Text> : null}
                  </View>
                ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <BottomDock
        active={null}
        onPressHome={() => navigation.navigate('Home')}
        onPressSettings={() => navigation.replace('Settings')}
      />
    </View>
  );
}
