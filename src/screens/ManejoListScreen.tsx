import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppHeader } from '../components/AppHeader';
import { BottomDock } from '../components/BottomDock';
import { listAllApiaries } from '../services/apiaryService';
import { useAppTheme } from '../theme/ThemeContext';
import { PALETTE } from '../theme/themes';
import type { RootStackParamList } from '../types/auth';
import type { Apiary } from '../types/apiary';

type Props = NativeStackScreenProps<RootStackParamList, 'ManejoList'>;

export function ManejoListScreen({ navigation }: Props) {
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
        title="Manejos"
        showBack
        onPressBack={() => navigation.goBack()}
        onPressBell={() => navigation.navigate('Notifications')}
        showMic={true}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* BLOCO DE APIÁRIOS NO TOPO */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>SELECIONE O APIÁRIO</Text>
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>{apiaries.length} {apiaries.length === 1 ? 'apiário' : 'apiários'}</Text>
          </View>
        </View>

        {apiaries.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <MaterialCommunityIcons name="tools" size={42} color={PALETTE.secondaryDark} />
            </View>
            <Text style={styles.emptyTitle}>Nenhum apiário cadastrado</Text>
            <Text style={styles.emptySubtitle}>
              Cadastre um apiário para registrar ações e intervenções de manejo.
            </Text>
            <Pressable
              style={styles.emptyButton}
              onPress={() => navigation.navigate('CreateEditApiary')}
            >
              <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
              <Text style={styles.emptyButtonText}>Cadastrar Apiário</Text>
            </Pressable>
          </View>
        ) : null}

        {apiaries.map((apiary) => (
          <View key={apiary.id} style={styles.apiaryCard}>
            <View style={styles.cardHeader}>
              <View style={styles.iconBadge}>
                <MaterialCommunityIcons name="beehive-outline" size={24} color={PALETTE.primaryDark} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.cardTitle}>{apiary.name}</Text>
                <View style={styles.tagsRow}>
                  <View style={styles.tagBadge}>
                    <MaterialCommunityIcons name="map-marker-outline" size={14} color={PALETTE.secondaryDark} />
                    <Text style={styles.tagText} numberOfLines={1}>{apiary.location || 'Sem localização'}</Text>
                  </View>
                  <View style={[styles.tagBadge, styles.tagBadgeAccent]}>
                    <MaterialCommunityIcons name="cube-outline" size={14} color={PALETTE.primaryDark} />
                    <Text style={[styles.tagText, { color: PALETTE.primaryDark, fontWeight: '700' }]}>
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
                    mode: 'manejo',
                    role: apiary.role || 'owner',
                  })
                }
              >
                <MaterialCommunityIcons name="tools" size={20} color="#FFFFFF" />
                <Text style={styles.primaryActionBtnText}>Realizar Novo Manejo</Text>
                <MaterialCommunityIcons name="arrow-right" size={18} color="#FFFFFF" style={{ marginLeft: 'auto' }} />
              </Pressable>

              <Pressable
                style={styles.secondaryActionBtn}
                onPress={() =>
                  navigation.navigate('ReviewReportsList', {
                    tipo: 'apiario',
                    apiaryId: apiary.id,
                    apiaryName: apiary.name,
                    role: apiary.role || 'owner',
                    initialTab: 'manejos',
                  })
                }
              >
                <MaterialCommunityIcons name="history" size={18} color={PALETTE.primaryDark} />
                <Text style={styles.secondaryActionBtnText}>Ver Histórico de Manejos</Text>
              </Pressable>
            </View>
          </View>
        ))}

        {/* CENTRO DE INTERVENÇÕES E MANEJOS (ABAIXO DOS APIÁRIOS) */}
        <View style={styles.bannerCard}>
          <View style={styles.bannerIconWrap}>
            <MaterialCommunityIcons name="tools" size={26} color={PALETTE.primaryDark} />
          </View>
          <View style={styles.bannerTextWrap}>
            <Text style={styles.bannerTitle}>Centro de Intervenções e Manejo</Text>
            <Text style={styles.bannerSubtitle}>
              Alimentação de subsistência/estímulo, divisão de enxames, troca de cera e introdução de rainhas.
            </Text>
          </View>
        </View>
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
      backgroundColor: PALETTE.lightSurface,
    },
    content: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 28,
      gap: 14,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 4,
      marginTop: 2,
    },
    sectionHeader: {
      fontSize: 13,
      fontWeight: '800',
      color: PALETTE.primaryDark,
      letterSpacing: 1.1,
    },
    sectionBadge: {
      backgroundColor: PALETTE.secondaryLight,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    sectionBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    bannerCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      padding: 16,
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: PALETTE.secondaryLight,
      marginTop: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    bannerIconWrap: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: PALETTE.vibrantAccent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bannerTextWrap: {
      flex: 1,
      gap: 3,
    },
    bannerTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: PALETTE.primaryDark,
      letterSpacing: 0.2,
    },
    bannerSubtitle: {
      fontSize: 12.5,
      color: PALETTE.primaryDark,
      opacity: 0.85,
      lineHeight: 18,
    },
    emptyCard: {
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: PALETTE.secondaryDark,
      backgroundColor: '#FFFFFF',
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
      width: 68,
      height: 68,
      borderRadius: 34,
      backgroundColor: PALETTE.lightSurface,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: PALETTE.primaryDark,
    },
    emptySubtitle: {
      marginTop: 6,
      fontSize: 13.5,
      color: PALETTE.secondaryDark,
      textAlign: 'center',
      lineHeight: 19,
      marginBottom: 18,
    },
    emptyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: PALETTE.primaryDark,
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderRadius: 14,
    },
    emptyButtonText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    apiaryCard: {
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: PALETTE.secondaryLight,
      backgroundColor: '#FFFFFF',
      padding: 18,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.06,
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
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: PALETTE.lightSurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: PALETTE.primaryDark,
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
      backgroundColor: PALETTE.lightSurface,
      borderWidth: 1,
      borderColor: PALETTE.secondaryDark,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    tagBadgeAccent: {
      backgroundColor: PALETTE.vibrantAccent,
      borderColor: PALETTE.secondaryLight,
    },
    tagText: {
      fontSize: 12,
      color: PALETTE.primaryDark,
      fontWeight: '600',
    },
    actionsContainer: {
      gap: 10,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: PALETTE.lightSurface,
    },
    primaryActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 14,
      paddingHorizontal: 18,
      borderRadius: 14,
      backgroundColor: PALETTE.secondaryLight,
      shadowColor: PALETTE.secondaryLight,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 2,
      minHeight: 52,
    },
    primaryActionBtnText: {
      fontSize: 15,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.2,
    },
    secondaryActionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: PALETTE.lightSurface,
      borderWidth: 1,
      borderColor: PALETTE.secondaryLight,
      minHeight: 46,
    },
    secondaryActionBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: PALETTE.primaryDark,
    },
  });
}
