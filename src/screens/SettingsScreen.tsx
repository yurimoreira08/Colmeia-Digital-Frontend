import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Switch, Text, View, TextInput, ActivityIndicator, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppHeader } from '../components/AppHeader';
import { BottomDock } from '../components/BottomDock';
import { ConfirmModal } from '../components/ConfirmModal';
import { useTestDataMode } from '../config/TestDataModeContext';
import { logout, getCurrentUser } from '../services/authService';
import { useAppTheme } from '../theme/ThemeContext';
import type { RootStackParamList, User } from '../types/auth';
import { useVoiceCommand } from '../voice/VoiceCommandContext';
import { hasUnsyncedRecords, getLocalConfigValue } from '../services/localDbService';


type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export function SettingsScreen({ navigation }: Props) {
  const { colors, options, themeName, setThemeName } = useAppTheme();
  const { setTestDataEnabled } = useTestDataMode();
  const { registerScreenCommandHandler } = useVoiceCommand();
  const panelAnim = useRef(new Animated.Value(0)).current;

  const [user, setUser] = useState<User | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const zoomAnim = useRef(new Animated.Value(0)).current;

  const handleZoomIn = () => {
    setIsZoomed(true);
    Animated.spring(zoomAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 60,
      friction: 7,
    }).start();
  };

  const handleZoomOut = () => {
    Animated.timing(zoomAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setIsZoomed(false);
    });
  };

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function loadUser() {
        const currentUser = await getCurrentUser();
        if (currentUser && active) {
          setUser(currentUser);
          if (currentUser.photo) {
            setProfilePhoto(currentUser.photo);
            const { setLocalConfigValue } = await import('../services/localDbService');
            await setLocalConfigValue(`profile_photo_${currentUser.id}`, currentUser.photo);
          } else {
            const savedPhoto = await getLocalConfigValue(`profile_photo_${currentUser.id}`);
            setProfilePhoto(savedPhoto || null);
          }
        }
      }
      loadUser();
      return () => {
        active = false;
      };
    }, [])
  );

  const styles = createStyles(colors);

  useEffect(() => {
    Animated.timing(panelAnim, {
      toValue: 1,
      duration: 420,
      useNativeDriver: true,
    }).start();
  }, [panelAnim]);

  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [hasUnsyncedData, setHasUnsyncedData] = useState(false);

  async function handleLogoutPrompt(): Promise<void> {
    try {
      const unsynced = await hasUnsyncedRecords();
      setHasUnsyncedData(unsynced);
    } catch {
      setHasUnsyncedData(false);
    }
    setLogoutModalVisible(true);
  }

  async function executeLogout(): Promise<void> {
    setLogoutModalVisible(false);
    await logout();
    navigation.replace('Login');
  }






  async function handleToggleTestData(nextValue: boolean): Promise<void> {
    try {
      await setTestDataEnabled(nextValue);
    } catch {
      // State rollback is handled by the context.
    }
  }

  useFocusEffect(
    useEffectVoiceCommands({
      navigation,
      options,
      setThemeName,
      registerScreenCommandHandler,
      handleToggleTestData,
      handleLogout: handleLogoutPrompt,
    }),
  );

  return (
    <View style={styles.safeArea}>
      <AppHeader
        title="Configurações"
        showBack
        onPressBack={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
            return;
          }

          navigation.replace('Home');
        }}
        onPressBell={() => navigation.navigate('Notifications')}
      />

      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.glowTop} />
        
        {/* 1. Hero Card de Perfil */}
        <Animated.View
          style={[
            styles.profileCard,
            {
              opacity: panelAnim,
              transform: [
                {
                  translateY: panelAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [16, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Pressable onPress={handleZoomIn} style={styles.avatarWrap}>
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={styles.profileAvatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={40} color={colors.accent} />
              </View>
            )}
            <View style={styles.zoomBadge}>
              <Ionicons name="search" size={12} color="#FFFFFF" />
            </View>
          </Pressable>

          <View style={styles.profileDetails}>
            <Text style={styles.profileName} numberOfLines={1}>{user?.name || 'Carregando...'}</Text>
            <Text style={styles.profileEmail} numberOfLines={1}>{user?.email || ''}</Text>
            
            <Pressable 
              style={styles.editProfileBtn} 
              onPress={() => navigation.navigate('EditProfile')}
            >
              <Ionicons name="pencil" size={14} color={colors.buttonText} />
              <Text style={styles.editProfileBtnText}>Editar Perfil</Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* 2. Seção Aparência */}
        <Text style={styles.sectionHeader}>APARÊNCIA</Text>
        <Animated.View
          style={[
            styles.sectionCard,
            {
              opacity: panelAnim,
              transform: [
                {
                  translateY: panelAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.sectionCardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: colors.accentSoft }]}>
              <Ionicons name="color-palette-outline" size={20} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>Tema Visual</Text>
              <Text style={styles.settingSubtitle}>Personalize o esquema de cores do app</Text>
            </View>
          </View>

          <View style={styles.themeChipsContainer}>
            {options.map((option) => {
              const selected = option.id === themeName;
              return (
                <Pressable
                  key={option.id}
                  style={[styles.themePill, selected ? styles.themePillActive : null]}
                  onPress={() => setThemeName(option.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Selecionar tema ${option.label}`}
                >
                  <Ionicons 
                    name={
                      option.id === 'obsidian-dark' 
                        ? 'moon-outline' 
                        : option.id === 'verde-floresta' 
                        ? 'leaf-outline' 
                        : 'color-palette-outline'
                    } 
                    size={15} 
                    color={selected ? colors.buttonText : colors.textPrimary} 
                  />
                  <Text style={[styles.themePillText, selected ? styles.themePillTextActive : null]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        {/* 3. Seção Sistema & Informações */}
        <Text style={styles.sectionHeader}>SISTEMA & AJUDA</Text>
        <Animated.View
          style={[
            styles.sectionCard,
            {
              opacity: panelAnim,
              transform: [
                {
                  translateY: panelAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [24, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Tutorial de Comandos de Voz */}
          <Pressable 
            style={styles.settingRow} 
            onPress={() => navigation.navigate('VoiceTutorial')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#D9770618' }]}>
              <Ionicons name="mic" size={20} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.settingTitle}>Tutorial de Comandos de Voz</Text>
                <View style={[styles.handsFreeBadge, { backgroundColor: colors.accentSoft }]}>
                  <Text style={[styles.handsFreeBadgeText, { color: colors.accent }]}>Mãos Livres</Text>
                </View>
              </View>
              <Text style={styles.settingSubtitle}>Aprenda a operar o app sem as mãos no apiário</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </Pressable>

          <View style={styles.rowDivider} />

          {/* Sobre o App */}
          <Pressable 
            style={styles.settingRow} 
            onPress={() => navigation.navigate('AboutApp')}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#6366F118' }]}>
              <Ionicons name="information-circle-outline" size={20} color="#6366F1" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>Sobre o Colmeia Digital</Text>
              <Text style={styles.settingSubtitle}>Versão, arquitetura e notas do sistema</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </Pressable>
        </Animated.View>

        {/* 4. Zona de Saída (Logout) */}
        <Animated.View
          style={[
            styles.logoutContainer,
            {
              opacity: panelAnim,
              transform: [
                {
                  translateY: panelAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [28, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Pressable 
            style={({ pressed }) => [
              styles.logoutCard,
              pressed ? styles.logoutCardPressed : null,
            ]} 
            onPress={handleLogoutPrompt}
          >
            <View style={styles.logoutIconCircle}>
              <Ionicons name="log-out-outline" size={20} color="#DC2626" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.logoutTitle}>Sair da Conta</Text>
              <Text style={styles.logoutSubtitle}>Desconectar seu usuário deste aparelho</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#EF4444" />
          </Pressable>
        </Animated.View>
      </ScrollView>

      <BottomDock
        active="settings"
        onPressHome={() => navigation.replace('Home')}
        onPressSettings={() => undefined}
      />

      <ConfirmModal
        visible={logoutModalVisible}
        title="Sair da Conta"
        message={
          hasUnsyncedData
            ? 'Você possui registros pendentes de sincronização. Ao sair agora, esses dados locais podem ser perdidos. Deseja realmente sair da sua conta?'
            : 'Tem certeza de que deseja encerrar sua sessão e sair da conta?'
        }
        confirmLabel="Sair da Conta"
        cancelLabel="Cancelar"
        isDestructive={true}
        onCancel={() => setLogoutModalVisible(false)}
        onConfirm={executeLogout}
      />

      {isZoomed && (
        <Pressable 
          style={StyleSheet.absoluteFillObject} 
          onPress={handleZoomOut}
        >
          <Animated.View 
            style={[
              styles.zoomBackdrop, 
              {
                opacity: zoomAnim
              }
            ]} 
          />
          <View style={styles.zoomContainer}>
            <Animated.View
              style={[
                styles.zoomCard,
                {
                  transform: [
                    { scale: zoomAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }
                  ],
                  opacity: zoomAnim
                }
              ]}
            >
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={styles.zoomedImage} resizeMode="contain" />
              ) : (
                <Ionicons name="person-circle-outline" size={200} color={colors.textPrimary} />
              )}
            </Animated.View>
          </View>
        </Pressable>
      )}
    </View>
  );
}

function useEffectVoiceCommands(params: {
  navigation: Props['navigation'];
  options: ReturnType<typeof useAppTheme>['options'];
  setThemeName: ReturnType<typeof useAppTheme>['setThemeName'];
  registerScreenCommandHandler: ReturnType<typeof useVoiceCommand>['registerScreenCommandHandler'];
  handleToggleTestData: (nextValue: boolean) => Promise<void>;
  handleLogout: () => Promise<void>;
}) {
  return useCallback(() => {
    const unsubscribe = params.registerScreenCommandHandler((transcript) => {
      const command = transcript
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[!?.,;:]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (!command) {
        return false;
      }

      if (
        command.includes('ativar dados de teste') ||
        command.includes('ligar dados de teste') ||
        command.includes('modo teste on') ||
        command.includes('habilitar dados de teste')
      ) {
        void params.handleToggleTestData(true);
        return true;
      }

      if (
        command.includes('desativar dados de teste') ||
        command.includes('desligar dados de teste') ||
        command.includes('modo teste off') ||
        command.includes('desabilitar dados de teste')
      ) {
        void params.handleToggleTestData(false);
        return true;
      }

      if (command.includes('abrir sobre') || command.includes('sobre o app') || command.includes('sobre aplicativo')) {
        params.navigation.navigate('AboutApp');
        return true;
      }

      if (command.includes('sair da conta') || command === 'sair' || command.includes('fazer logout')) {
        void params.handleLogout();
        return true;
      }

      if (command.includes('voltar')) {
        if (params.navigation.canGoBack()) {
          params.navigation.goBack();
        } else {
          params.navigation.replace('Home');
        }

        return true;
      }

      const matchedTheme = params.options.find((option) => {
        const label = option.label
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');

        return command.includes(label) || command.includes(option.id);
      });

      if (command.includes('tema') && matchedTheme) {
        params.setThemeName(matchedTheme.id);
        return true;
      }

      return false;
    });

    return () => {
      unsubscribe();
    };
  }, [params]);
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingTop: 16,
      paddingHorizontal: 18,
      paddingBottom: 32,
    },
    glowTop: {
      position: 'absolute',
      top: 0,
      right: -36,
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor: colors.glowA,
      opacity: 0.24,
    },
    sectionHeader: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.textMuted,
      letterSpacing: 1.2,
      marginTop: 20,
      marginBottom: 8,
      marginLeft: 4,
    },
    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 18,
      backgroundColor: colors.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 10,
      elevation: 2,
      gap: 16,
    },
    avatarWrap: {
      position: 'relative',
    },
    profileAvatar: {
      width: 74,
      height: 74,
      borderRadius: 37,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.accent,
    },
    avatarPlaceholder: {
      width: 74,
      height: 74,
      borderRadius: 37,
      backgroundColor: colors.accentSoft,
      borderWidth: 2,
      borderColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    zoomBadge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      backgroundColor: colors.accent,
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: colors.surface,
    },
    profileDetails: {
      flex: 1,
      gap: 4,
    },
    profileName: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.textPrimary,
      letterSpacing: 0.2,
    },
    profileEmail: {
      fontSize: 13,
      color: colors.textMuted,
    },
    editProfileBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      backgroundColor: colors.accent,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 10,
      marginTop: 6,
    },
    editProfileBtnText: {
      fontSize: 12,
      color: colors.buttonText,
      fontWeight: '700',
    },
    sectionCard: {
      backgroundColor: colors.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 1,
    },
    sectionCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 14,
    },
    iconCircle: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    settingTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    settingSubtitle: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    themeChipsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    themePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    themePillActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    themePillText: {
      fontSize: 13,
      color: colors.textPrimary,
      fontWeight: '600',
    },
    themePillTextActive: {
      color: colors.buttonText,
      fontWeight: '700',
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    rowDivider: {
      height: 1,
      backgroundColor: colors.cardBorder,
      marginVertical: 12,
    },
    handsFreeBadge: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
    },
    handsFreeBadgeText: {
      fontSize: 10,
      fontWeight: '800',
    },
    logoutContainer: {
      marginTop: 24,
    },
    logoutCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: '#FCA5A5',
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 1,
    },
    logoutCardPressed: {
      backgroundColor: '#FEF2F2',
      transform: [{ scale: 0.99 }],
    },
    logoutIconCircle: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: '#FEE2E2',
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoutTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: '#DC2626',
    },
    logoutSubtitle: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    zoomBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      zIndex: 9999,
    },
    zoomContainer: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10000,
    },
    zoomCard: {
      width: 280,
      height: 280,
      borderRadius: 140,
      overflow: 'hidden',
      borderWidth: 3,
      borderColor: colors.accent,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.5,
      shadowRadius: 15,
      elevation: 10,
    },
    zoomedImage: {
      width: '100%',
      height: '100%',
    },
  });
}

