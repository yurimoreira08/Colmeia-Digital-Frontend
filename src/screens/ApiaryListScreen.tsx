import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppHeader } from '../components/AppHeader';
import { BottomDock } from '../components/BottomDock';
import { ConfirmModal } from '../components/ConfirmModal';
import { ExportPdfModal } from '../components/ExportPdfModal';
import { listAllApiaries, removeApiary } from '../services/apiaryService';
import { listRevisionReports } from '../services/reviewReportService';
import { listManejoReports } from '../services/manejoService';
import { APP_SESSION_START } from '../utils/session';
import { useAppTheme } from '../theme/ThemeContext';
import { PALETTE } from '../theme/themes';
import type { RootStackParamList } from '../types/auth';
import type { Apiary } from '../types/apiary';
import { useVoiceCommand } from '../voice/VoiceCommandContext';

type Props = NativeStackScreenProps<RootStackParamList, 'ApiaryList'>;

export function ApiaryListScreen({ navigation }: Props) {
  const { colors } = useAppTheme();
  const { registerScreenCommandHandler } = useVoiceCommand();
  const styles = createStyles(colors);
  const [apiaries, setApiaries] = useState<Apiary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [pdfApiary, setPdfApiary] = useState<Apiary | null>(null);

  async function loadSortedApiaries(): Promise<Apiary[]> {
    const [apiaryData, revData, manData] = await Promise.all([
      listAllApiaries(),
      listRevisionReports(),
      listManejoReports(),
    ]);

    const handledApiaryIds = new Set<number>();
    const addHandled = (apiaryId?: number | null, date?: string) => {
      if (apiaryId && date && date >= APP_SESSION_START) {
        handledApiaryIds.add(apiaryId);
      }
    };

    revData.forEach((r) => addHandled(r.apiaryId, r.createdAt));
    manData.forEach((m) => addHandled(m.apiaryId, m.createdAt));

    const sorted = [...apiaryData].sort((a, b) => {
      const aHandled = handledApiaryIds.has(a.id);
      const bHandled = handledApiaryIds.has(b.id);
      if (aHandled && !bHandled) return -1;
      if (!aHandled && bHandled) return 1;
      return a.name.localeCompare(b.name);
    });

    return sorted;
  }

  async function refreshApiaries(): Promise<Apiary[]> {
    const data = await loadSortedApiaries();
    setApiaries(data);
    return data;
  }

  function normalizeVoiceText(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[!?.,;:]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function findApiaryByName(command: string): Apiary | undefined {
    const names = apiaries.map((item) => ({
      item,
      normalized: normalizeVoiceText(item.name),
    }));

    return names.find(({ normalized }) => command.includes(normalized))?.item;
  }

  async function handleDelete(): Promise<void> {
    if (!deleteId) return;

    try {
      setSaving(true);
      await removeApiary(deleteId);
      await refreshApiaries();
      setDeleteId(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao excluir apiário.';
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      async function load(): Promise<void> {
        const data = await loadSortedApiaries();
        if (mounted) {
          setApiaries(data);
        }
      }

      load();

      return () => {
        mounted = false;
      };
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      const unsubscribe = registerScreenCommandHandler((transcript) => {
        const command = normalizeVoiceText(transcript);

        if (!command) {
          return false;
        }

        if (
          command.includes('cadastrar apiario') ||
          command.includes('novo apiario') ||
          command.includes('abrir cadastro')
        ) {
          navigation.navigate('CreateEditApiary');
          return true;
        }

        if (command.startsWith('editar apiario ')) {
          const target = command.replace(/^editar apiario\s+/, '').trim();
          const apiary = apiaries.find((item) => normalizeVoiceText(item.name) === target) ?? findApiaryByName(target);

          if (apiary) {
            navigation.navigate('CreateEditApiary', { apiaryId: apiary.id });
            return true;
          }
        }

        if (
          command.startsWith('abrir apiario ') ||
          command.startsWith('apiario ') ||
          command.startsWith('selecionar apiario ') ||
          command.startsWith('ver caixas do apiario ')
        ) {
          const target = command
            .replace(/^abrir apiario\s+/, '')
            .replace(/^selecionar apiario\s+/, '')
            .replace(/^ver caixas do apiario\s+/, '')
            .replace(/^apiario\s+/, '')
            .trim();

          const apiary = apiaries.find((item) => normalizeVoiceText(item.name) === target) ?? findApiaryByName(target);

          if (apiary) {
            navigation.navigate('BoxesList', {
              apiaryId: apiary.id,
              apiaryName: apiary.name,
            });
            return true;
          }
        }

        return false;
      });

      return () => {
        unsubscribe();
      };
    }, [apiaries, navigation, registerScreenCommandHandler]),
  );

  return (
    <View style={styles.container}>
      <AppHeader
        title="Apiários"
        showBack={true}
        onPressBack={() => navigation.navigate('Home')}
        showNotificationIcon={true}
        onPressBell={() => navigation.navigate('Notifications')}
        showMic={true}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Botão ampliado "Cadastrar Novo Apiário" */}
        <Pressable
          style={styles.addButton}
          onPress={() => navigation.navigate('CreateEditApiary')}
          accessibilityRole="button"
          accessibilityLabel="Cadastrar Novo Apiário"
        >
          <MaterialCommunityIcons name="plus-circle-outline" size={24} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Cadastrar Novo Apiário</Text>
        </Pressable>

        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>Unidades Registradas ({apiaries.length})</Text>

          {apiaries.length === 0 ? (
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name="home-group" size={56} color={PALETTE.secondaryMedium} />
              <Text style={styles.emptyTitle}>Nenhum apiário cadastrado</Text>
              <Text style={styles.emptySubtitle}>Toque no botão acima para cadastrar seu primeiro apiário.</Text>
            </View>
          ) : (
            apiaries.map((apiary) => {
              return (
                <Pressable
                  accessibilityRole="button"
                  key={apiary.id}
                  style={styles.apiaryCard}
                  onPress={() => {
                    navigation.navigate('BoxesList', {
                      apiaryId: apiary.id,
                      apiaryName: apiary.name,
                      role: 'owner',
                    });
                  }}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.titleArea}>
                      <Text style={styles.apiaryName}>{apiary.name}</Text>
                      <View style={styles.locationRow}>
                        <MaterialCommunityIcons name="map-marker-outline" size={18} color={PALETTE.secondaryMedium} />
                        <Text style={styles.apiaryLocation}>{apiary.location}</Text>
                      </View>
                    </View>

                    <View style={styles.headerRightArea}>
                      <View style={styles.badgeBoxCount}>
                        <Text style={styles.boxCountText}>{apiary.boxCount} {apiary.boxCount === 1 ? 'caixa' : 'caixas'}</Text>
                      </View>
                      <View style={styles.headerIconActions}>
                        <Pressable
                          accessibilityRole="button"
                          style={styles.headerIconBtn}
                          onPress={() => navigation.navigate('CreateEditApiary', { apiaryId: apiary.id })}
                          hitSlop={8}
                          accessibilityLabel="Editar apiário"
                        >
                          <MaterialCommunityIcons name="pencil-outline" size={18} color={PALETTE.primaryDark} />
                        </Pressable>

                        <Pressable
                          accessibilityRole="button"
                          style={[styles.headerIconBtn, styles.headerIconBtnDelete]}
                          onPress={() => setDeleteId(apiary.id)}
                          hitSlop={8}
                          accessibilityLabel="Excluir apiário"
                        >
                          <MaterialCommunityIcons name="trash-can-outline" size={18} color={PALETTE.dangerRed} />
                        </Pressable>
                      </View>
                    </View>
                  </View>

                  {apiary.description ? (
                    <Text style={styles.apiaryDesc} numberOfLines={2}>
                      {apiary.description}
                    </Text>
                  ) : null}

                  <View style={styles.cardActions}>
                    <Pressable
                      accessibilityRole="button"
                      style={[styles.actionBtn, styles.actionBtnMain]}
                      onPress={() => {
                        navigation.navigate('BoxesList', {
                          apiaryId: apiary.id,
                          apiaryName: apiary.name,
                          role: 'owner',
                        });
                      }}
                    >
                      <MaterialCommunityIcons name="cube-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.actionBtnTextMain}>Ver Caixas</Text>
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      style={[styles.actionBtn, styles.actionBtnHighlight]}
                      onPress={() => {
                        navigation.navigate('BoxesList', {
                          apiaryId: apiary.id,
                          apiaryName: apiary.name,
                          role: 'owner',
                          openAddBox: true,
                        });
                      }}
                    >
                      <MaterialCommunityIcons name="plus-circle-outline" size={18} color={PALETTE.primaryDark} />
                      <Text style={[styles.actionBtnText, styles.actionBtnTextHighlight]}>+ Caixa</Text>
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      style={[styles.actionBtn, styles.actionBtnPdf]}
                      onPress={() => setPdfApiary(apiary)}
                      accessibilityLabel="Exportar relatório em PDF de todas as caixas"
                    >
                      <MaterialCommunityIcons name="file-pdf-box" size={20} color="#DC2626" />
                      <Text style={styles.actionBtnPdfText}>PDF</Text>
                    </Pressable>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>

      <ExportPdfModal
        visible={Boolean(pdfApiary)}
        onClose={() => setPdfApiary(null)}
        targetTitle={pdfApiary?.name || 'Apiário'}
        targetSubtitle={`${pdfApiary?.boxCount || 0} caixas • Todas as atividades`}
        apiaryId={pdfApiary?.id}
        apiaryName={pdfApiary?.name}
        apiaryLocation={pdfApiary?.location}
      />

      <ConfirmModal
        visible={Boolean(deleteId)}
        title="Excluir Apiário"
        message="Tem certeza que deseja excluir este apiário? Todas as caixas, revisões e manejos vinculados serão apagados."
        confirmLabel="Sim, Excluir"
        cancelLabel="Cancelar"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />

      <BottomDock
        active={null}
        onPressHome={() => navigation.navigate('Home')}
        onPressSettings={() => navigation.replace('Settings')}
      />
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 110,
    },
    errorBox: {
      backgroundColor: '#FFEBEE',
      borderLeftWidth: 4,
      borderLeftColor: PALETTE.dangerRed,
      padding: 14,
      borderRadius: 10,
      marginBottom: 16,
    },
    errorText: {
      color: PALETTE.dangerRed,
      fontSize: 14,
      fontWeight: '600',
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: PALETTE.primaryDark,
      borderWidth: 1.5,
      borderColor: PALETTE.secondaryLight,
      paddingVertical: 18,
      paddingHorizontal: 24,
      borderRadius: 16,
      marginBottom: 20,
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      gap: 10,
    },
    addButtonText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '800',
      letterSpacing: 0.3,
    },
    listSection: {
      flex: 1,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: PALETTE.primaryDark,
      marginBottom: 14,
      letterSpacing: 0.2,
    },
    emptyCard: {
      backgroundColor: '#FFFFFF',
      padding: 40,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: PALETTE.lightBg,
      borderStyle: 'dashed',
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: PALETTE.primaryDark,
      marginTop: 14,
    },
    emptySubtitle: {
      fontSize: 15,
      color: PALETTE.secondaryMedium,
      textAlign: 'center',
      marginTop: 6,
      lineHeight: 22,
    },
    apiaryCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 18,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1.5,
      borderColor: PALETTE.lightBg,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    titleArea: {
      flex: 1,
      marginRight: 10,
    },
    apiaryName: {
      fontSize: 20,
      fontWeight: '800',
      color: PALETTE.primaryDark,
      marginBottom: 6,
      letterSpacing: 0.2,
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    apiaryLocation: {
      fontSize: 15,
      color: PALETTE.secondaryMedium,
      fontWeight: '500',
    },
    headerRightArea: {
      alignItems: 'flex-end',
      gap: 6,
    },
    badgeBoxCount: {
      backgroundColor: PALETTE.lightBg,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 12,
    },
    boxCountText: {
      fontSize: 13,
      fontWeight: '800',
      color: PALETTE.primaryDark,
    },
    headerIconActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    headerIconBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: PALETTE.lightBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerIconBtnDelete: {
      backgroundColor: '#FEE2E2',
    },
    apiaryDesc: {
      fontSize: 14,
      color: PALETTE.primaryDark,
      marginTop: 6,
      marginBottom: 12,
      lineHeight: 20,
      fontWeight: '400',
    },
    cardActions: {
      flexDirection: 'row',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: PALETTE.lightBg,
      paddingTop: 12,
      gap: 8,
    },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderRadius: 10,
      backgroundColor: PALETTE.lightBg,
    },
    actionBtnMain: {
      flex: 1.2,
      backgroundColor: PALETTE.primaryDark,
    },
    actionBtnTextMain: {
      fontSize: 13,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    actionBtnHighlight: {
      flex: 1,
      backgroundColor: PALETTE.vibrantAccent,
    },
    actionBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: PALETTE.primaryDark,
    },
    actionBtnTextHighlight: {
      color: PALETTE.primaryDark,
      fontWeight: '800',
    },
    actionBtnPdf: {
      flex: 0.9,
      backgroundColor: '#FEF2F2',
      borderWidth: 1,
      borderColor: '#FCA5A5',
    },
    actionBtnPdfText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#DC2626',
    },
  });
}
