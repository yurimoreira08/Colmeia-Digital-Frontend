import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
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
import { listAllApiaries, removeApiary } from '../services/apiaryService';
import { listRevisionReports } from '../services/reviewReportService';
import { listManejoReports } from '../services/manejoService';
import { APP_SESSION_START } from '../utils/session';
import { useAppTheme } from '../theme/ThemeContext';
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

        <Pressable
          style={styles.addButton}
          onPress={() => navigation.navigate('CreateEditApiary')}
        >
          <Ionicons name="add-circle-outline" size={22} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Cadastrar Novo Apiário</Text>
        </Pressable>

        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>Unidades Registradas ({apiaries.length})</Text>

          {apiaries.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="business-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>Nenhum apiário cadastrado</Text>
              <Text style={styles.emptySubtitle}>Toque no botão acima para cadastrar seu primeiro apiário.</Text>
            </View>
          ) : (
            apiaries.map((apiary) => {
              return (
                <Pressable
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
                        <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                        <Text style={styles.apiaryLocation}>{apiary.location}</Text>
                      </View>
                    </View>

                    <View style={styles.badgeBoxCount}>
                      <Text style={styles.boxCountText}>{apiary.boxCount} caixas</Text>
                    </View>
                  </View>

                  {apiary.description ? (
                    <Text style={styles.apiaryDesc} numberOfLines={2}>
                      {apiary.description}
                    </Text>
                  ) : null}

                  <View style={styles.cardActions}>
                    <Pressable
                      style={styles.actionBtn}
                      onPress={() => {
                        navigation.navigate('BoxesList', {
                          apiaryId: apiary.id,
                          apiaryName: apiary.name,
                          role: 'owner',
                        });
                      }}
                    >
                      <Ionicons name="cube-outline" size={16} color={colors.headerBackground} />
                      <Text style={styles.actionBtnText}>Ver Caixas</Text>
                    </Pressable>

                    <Pressable
                      style={styles.actionBtn}
                      onPress={() => navigation.navigate('CreateEditApiary', { apiaryId: apiary.id })}
                    >
                      <Ionicons name="pencil-outline" size={16} color={colors.textMuted} />
                      <Text style={[styles.actionBtnText, { color: colors.textMuted }]}>Editar</Text>
                    </Pressable>

                    <Pressable
                      style={styles.actionBtn}
                      onPress={() => setDeleteId(apiary.id)}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.error} />
                    </Pressable>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>

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
      paddingBottom: 100,
    },
    errorBox: {
      backgroundColor: '#FFEBEE',
      borderLeftWidth: 4,
      borderLeftColor: colors.error,
      padding: 12,
      borderRadius: 4,
      marginBottom: 16,
    },
    errorText: {
      color: colors.error,
      fontSize: 14,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 12,
      marginBottom: 20,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    addButtonText: {
      color: colors.buttonText,
      fontSize: 16,
      fontWeight: 'bold',
      marginLeft: 8,
    },
    listSection: {
      flex: 1,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginBottom: 12,
    },
    emptyCard: {
      backgroundColor: colors.card,
      padding: 32,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderStyle: 'dashed',
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginTop: 12,
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 4,
    },
    apiaryCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      elevation: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    titleArea: {
      flex: 1,
      marginRight: 8,
    },
    apiaryName: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    apiaryLocation: {
      fontSize: 13,
      color: colors.textMuted,
      marginLeft: 4,
    },
    badgeBoxCount: {
      backgroundColor: colors.surface,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    boxCountText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    apiaryDesc: {
      fontSize: 14,
      color: colors.textMuted,
      marginBottom: 12,
      lineHeight: 20,
    },
    cardActions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      borderTopWidth: 1,
      borderTopColor: colors.divider,
      paddingTop: 12,
      gap: 8,
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 6,
      backgroundColor: colors.surface,
    },
    actionBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textPrimary,
      marginLeft: 4,
    },
  });
}
