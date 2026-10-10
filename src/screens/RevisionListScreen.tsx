import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppHeader } from '../components/AppHeader';
import { BottomDock } from '../components/BottomDock';
import { listAllApiaries } from '../services/apiaryService';
import { useAppTheme } from '../theme/ThemeContext';
import type { RootStackParamList } from '../types/auth';
import type { Apiary } from '../types/apiary';

type Props = NativeStackScreenProps<RootStackParamList, 'RevisionList'>;

export function RevisionListScreen({ navigation }: Props) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [apiaries, setApiaries] = useState<Apiary[]>([]);

  const loadData = useCallback(async () => {
    const data = await listAllApiaries();
    setApiaries(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  return (
    <View style={styles.safeArea}>
      <AppHeader
        title="Revisões"
        showBack
        onPressBack={() => navigation.goBack()}
        onPressBell={() => navigation.navigate('Notifications')}
        showMic={true}
      />

      <ScrollView 
        contentContainerStyle={styles.content} 
        showsVerticalScrollIndicator={false}
      >
        {/* Banner Operacional do Módulo */}
        <View style={styles.bannerCard}>
          <View style={styles.bannerIconWrap}>
            <Ionicons name="clipboard-outline" size={24} color="#059669" />
          </View>
          <View style={styles.bannerTextWrap}>
            <Text style={styles.bannerTitle}>Painel de Revisões Periódicas</Text>
            <Text style={styles.bannerSubtitle}>
              Avalie a postura da rainha, crias, melgueiras e sanidade dos enxames.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionHeader}>SELECIONE O APIÁRIO</Text>

        {apiaries.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="clipboard-outline" size={38} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>Nenhum apiário cadastrado</Text>
            <Text style={styles.emptySubtitle}>
              Cadastre um apiário para registrar as avaliações técnicas e revisões periódicas.
            </Text>
            <Pressable
              style={styles.emptyButton}
              onPress={() => navigation.navigate('CreateEditApiary')}
            >
              <Ionicons name="add" size={18} color={colors.buttonText} />
              <Text style={styles.emptyButtonText}>Cadastrar Apiário</Text>
            </Pressable>
          </View>
        ) : null}

        {apiaries.map((apiary) => (
          <View key={apiary.id} style={styles.apiaryCard}>
            <View style={styles.cardHeader}>
              <View style={styles.iconBadge}>
                <Ionicons name="business" size={20} color="#059669" />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.cardTitle}>{apiary.name}</Text>
                <View style={styles.tagsRow}>
                  <View style={styles.tagBadge}>
                    <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                    <Text style={styles.tagText} numberOfLines={1}>{apiary.location || 'Sem localização'}</Text>
                  </View>
                  <View style={[styles.tagBadge, styles.tagBadgeAccent]}>
                    <Ionicons name="cube-outline" size={12} color="#059669" />
                    <Text style={[styles.tagText, { color: '#059669', fontWeight: '700' }]}>
                      {apiary.boxCount} {apiary.boxCount === 1 ? 'caixa' : 'caixas'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.actionsContainer}>
              <Pressable
                style={styles.primaryActionBtn}
                onPress={() =>
                  navigation.navigate('BoxesList', {
                    apiaryId: apiary.id,
                    apiaryName: apiary.name,
                    mode: 'revision',
                  })
                }
              >
                <Ionicons name="add-circle" size={18} color="#FFFFFF" />
                <Text style={styles.primaryActionBtnText}>Iniciar Nova Revisão</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 'auto' }} />
              </Pressable>

              <Pressable
                style={styles.secondaryActionBtn}
                onPress={() =>
                  navigation.navigate('ReviewReportsList', {
                    tipo: 'apiario',
                    apiaryId: apiary.id,
                    apiaryName: apiary.name,
                    role: apiary.role || 'owner',
                    initialTab: 'revisoes',
                  })
                }
              >
                <Ionicons name="time-outline" size={16} color={colors.textPrimary} />
                <Text style={styles.secondaryActionBtnText}>Ver Histórico de Revisões</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>

      <BottomDock
        active={null}
        onPressHome={() => navigation.replace('Home')}
        onPressSettings={() => navigation.replace('Settings')}
      />
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: 18,
      paddingTop: 16,
      paddingBottom: 28,
      gap: 14,
    },
    bannerCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      padding: 16,
      backgroundColor: colors.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: '#A7F3D0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 1,
    },
    bannerIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: '#D1FAE5',
      alignItems: 'center',
      justifyContent: 'center',
    },
    bannerTextWrap: {
      flex: 1,
      gap: 2,
    },
    bannerTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: '#065F46',
      letterSpacing: 0.2,
    },
    bannerSubtitle: {
      fontSize: 12,
      color: colors.textMuted,
      lineHeight: 16,
    },
    sectionHeader: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.textMuted,
      letterSpacing: 1.2,
      marginTop: 6,
      marginBottom: -2,
      marginLeft: 4,
    },
    emptyCard: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.card,
      padding: 28,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 1,
    },
    emptyIconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    emptySubtitle: {
      marginTop: 6,
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 18,
      marginBottom: 16,
    },
    emptyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.accent,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
    },
    emptyButtonText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.buttonText,
    },
    apiaryCard: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.card,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
      gap: 14,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    iconBadge: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: '#D1FAE5',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
      letterSpacing: 0.2,
    },
    tagsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 2,
    },
    tagBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    tagBadgeAccent: {
      backgroundColor: '#ECFDF5',
      borderColor: '#A7F3D0',
    },
    tagText: {
      fontSize: 11.5,
      color: colors.textMuted,
      fontWeight: '500',
    },
    actionsContainer: {
      gap: 8,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
    },
    primaryActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: '#059669',
      shadowColor: '#059669',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.18,
      shadowRadius: 4,
      elevation: 2,
    },
    primaryActionBtnText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.2,
    },
    secondaryActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    secondaryActionBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textPrimary,
    },
  });
}
