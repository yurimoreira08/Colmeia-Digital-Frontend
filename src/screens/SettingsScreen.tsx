import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppHeader } from '../components/AppHeader';
import { BottomDock } from '../components/BottomDock';
import { ConfirmModal } from '../components/ConfirmModal';
import { DeleteAccountModal } from '../components/DeleteAccountModal';
import { deleteAccount } from '../services/accountService';
import { useTestDataMode } from '../config/TestDataModeContext';
import { logout, getCurrentUser } from '../services/authService';
import { useAppTheme } from '../theme/ThemeContext';
import { PALETTE } from '../theme/themes';
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

  // LGPD: excluir a conta.
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  async function handleDeleteAccount(password: string): Promise<void> {
    await deleteAccount(password);
    setDeleteModalVisible(false);
    navigation.replace('Login');
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
      // rollback handled by context
    }
  }

  // Filtrar apenas Claro e Escuro (remover Verde Floresta)
  const availableThemeOptions = options.filter(
    (opt) => opt.id === 'claro' || opt.id === 'escuro'
  );

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
        {/* 1. Hero Card de Perfil AUMENTADO */}
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
          <Pressable accessibilityRole="button" accessibilityLabel="Ampliar foto de perfil" onPress={handleZoomIn} style={styles.avatarWrap}>
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={styles.profileAvatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <MaterialCommunityIcons name="account" size={48} color={PALETTE.primaryDark} />
              </View>
            )}
            <View style={styles.zoomBadge}>
              <MaterialCommunityIcons name="magnify" size={13} color="#FFFFFF" />
            </View>
          </Pressable>

          <View style={styles.profileDetails}>
            <Text style={styles.profileName} numberOfLines={1}>{user?.name || 'Carregando...'}</Text>
            <Text style={styles.profileEmail} numberOfLines={1}>{user?.email || ''}</Text>
            
            <Pressable 
              accessibilityRole="button"
              style={styles.editProfileBtn} 
              onPress={() => navigation.navigate('EditProfile')}
            >
              <MaterialCommunityIcons name="pencil" size={16} color="#FFFFFF" />
              <Text style={styles.editProfileBtnText}>Editar Perfil</Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* 2. CARD UNIFICADO: Aparência + Sistema & Ajuda + Sair da Conta */}
        <Animated.View
          style={[
            styles.unifiedCard,
            {
              opacity: panelAnim,
              transform: [
                {
                  translateY: panelAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [22, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Item 1: Tema Visual (Aparência) */}
          <View style={styles.themeSectionWrap}>
            <View style={styles.settingRow}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="palette-outline" size={22} color={PALETTE.primaryDark} />
              </View>
              <Text style={styles.settingTitle}>Tema Visual</Text>
            </View>

            <View style={styles.themeChipsContainer}>
              {availableThemeOptions.map((option) => {
                const selected = option.id === themeName;
                return (
                  <Pressable
                    key={option.id}
                    style={[styles.themePill, selected ? styles.themePillActive : null]}
                    onPress={() => setThemeName(option.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Selecionar tema ${option.label}`}
                  >
                    <MaterialCommunityIcons 
                      name={option.id === 'escuro' ? 'weather-night' : 'weather-sunny'} 
                      size={18} 
                      color={selected ? '#FFFFFF' : PALETTE.primaryDark} 
                    />
                    <Text style={[styles.themePillText, selected ? styles.themePillTextActive : null]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.rowDivider} />

          {/* Item 2: Tutorial de Comandos de Voz (SEM SUBTÍTULO) */}
          <Pressable 
            accessibilityRole="button"
            style={styles.settingRow} 
            onPress={() => navigation.navigate('VoiceTutorial')}
          >
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="microphone" size={22} color={PALETTE.primaryDark} />
            </View>
            <Text style={styles.settingTitle}>Tutorial de Comandos de Voz</Text>
            <MaterialCommunityIcons name="chevron-right" size={24} color={PALETTE.secondaryDark} style={{ marginLeft: 'auto' }} />
          </Pressable>

          <View style={styles.rowDivider} />

          {/* Item 3: Sobre o Colmeia Digital (SEM SUBTÍTULO) */}
          <Pressable 
            accessibilityRole="button"
            style={styles.settingRow} 
            onPress={() => navigation.navigate('AboutApp')}
          >
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="information-outline" size={22} color={PALETTE.primaryDark} />
            </View>
            <Text style={styles.settingTitle}>Sobre o Colmeia Digital</Text>
            <MaterialCommunityIcons name="chevron-right" size={24} color={PALETTE.secondaryDark} style={{ marginLeft: 'auto' }} />
          </Pressable>

          <View style={styles.rowDivider} />

          {/* Dados pessoais (LGPD) */}
          <Pressable accessibilityRole="button" style={styles.settingRow} onPress={() => setDeleteModalVisible(true)}>
            <View style={[styles.iconCircle, styles.logoutIconCircle]}>
              <MaterialCommunityIcons name="account-remove-outline" size={22} color={PALETTE.danger} />
            </View>
            <Text style={[styles.settingTitle, { color: '#B91C1C' }]}>Excluir minha conta</Text>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#B91C1C" style={{ marginLeft: 'auto' }} />
          </Pressable>

          <View style={styles.rowDivider} />

          {/* Item 4: Sair da Conta (SEM SUBTÍTULO) */}
          <Pressable 
            accessibilityRole="button"
            style={styles.settingRow} 
            onPress={handleLogoutPrompt}
          >
            <View style={[styles.iconCircle, styles.logoutIconCircle]}>
              <MaterialCommunityIcons name="logout" size={22} color={PALETTE.danger} />
            </View>
            <Text style={[styles.settingTitle, { color: PALETTE.danger }]}>Sair da Conta</Text>
            <MaterialCommunityIcons name="chevron-right" size={24} color={PALETTE.danger} style={{ marginLeft: 'auto' }} />
          </Pressable>
        </Animated.View>
      </ScrollView>

      {/* RODAPÉ FROM BOILES FIXADO NA BASE */}
      <View style={styles.footerWrap}>
        <Text style={styles.footerBrand}>FROM BOILES</Text>
      </View>

      <BottomDock
        active="settings"
        onPressHome={() => navigation.replace('Home')}
        onPressSettings={() => undefined}
      />

      {/* Modal de Confirmação de Logout */}
      <ConfirmModal
        visible={logoutModalVisible}
        title="Sair da Conta"
        message={
          hasUnsyncedData
            ? 'Atenção: Existem anotações ou registros ainda não sincronizados com a nuvem neste aparelho. Se você sair agora sem conexão, esses dados podem demorar para atualizar. Deseja sair mesmo assim?'
            : 'Tem certeza que deseja desconectar de sua conta neste aparelho?'
        }
        confirmLabel="Sim, Sair"
        cancelLabel="Cancelar"
        isDestructive={true}
        onConfirm={() => void executeLogout()}
        onCancel={() => setLogoutModalVisible(false)}
      />

      <DeleteAccountModal
        visible={deleteModalVisible}
        onCancel={() => setDeleteModalVisible(false)}
        onConfirm={handleDeleteAccount}
      />

      {/* Modal de Zoom do Avatar */}
      {isZoomed && (
        <Animated.View style={[styles.zoomBackdrop, { opacity: zoomAnim }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Fechar foto ampliada" style={styles.zoomContainer} onPress={handleZoomOut}>
            <Animated.View
              style={[
                styles.zoomCard,
                {
                  transform: [
                    {
                      scale: zoomAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.3, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={styles.zoomedImage} resizeMode="cover" />
              ) : (
                <MaterialCommunityIcons name="account" size={140} color={PALETTE.primaryDark} />
              )}
            </Animated.View>
          </Pressable>
        </Animated.View>
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
      backgroundColor: PALETTE.lightSurface,
    },
    content: {
      paddingTop: 16,
      paddingHorizontal: 16,
      paddingBottom: 24,
      gap: 16,
    },
    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 20,
      backgroundColor: '#FFFFFF',
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: PALETTE.secondaryLight,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 10,
      elevation: 2,
      gap: 18,
    },
    avatarWrap: {
      position: 'relative',
    },
    profileAvatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: PALETTE.lightSurface,
      borderWidth: 2.5,
      borderColor: PALETTE.primaryDark,
    },
    avatarPlaceholder: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: PALETTE.lightSurface,
      borderWidth: 2.5,
      borderColor: PALETTE.primaryDark,
      alignItems: 'center',
      justifyContent: 'center',
    },
    zoomBadge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      backgroundColor: PALETTE.primaryDark,
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: '#FFFFFF',
    },
    profileDetails: {
      flex: 1,
      gap: 5,
    },
    profileName: {
      fontSize: 20,
      fontWeight: '800',
      color: PALETTE.primaryDark,
      letterSpacing: 0.2,
    },
    profileEmail: {
      fontSize: 15,
      color: PALETTE.secondaryDark,
      fontWeight: '600',
    },
    editProfileBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      backgroundColor: PALETTE.primaryDark,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      marginTop: 4,
    },
    editProfileBtnText: {
      fontSize: 14,
      color: '#FFFFFF',
      fontWeight: '700',
    },

    // Card unificado
    unifiedCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: PALETTE.secondaryLight,
      padding: 18,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
      gap: 14,
    },
    themeSectionWrap: {
      gap: 12,
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingVertical: 4,
    },
    iconCircle: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: PALETTE.lightSurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoutIconCircle: {
      backgroundColor: '#FEE2E2',
    },
    settingTitle: {
      fontSize: 16.5,
      fontWeight: '700',
      color: PALETTE.primaryDark,
    },
    themeChipsContainer: {
      flexDirection: 'row',
      gap: 10,
      paddingLeft: 58,
    },
    themePill: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: PALETTE.secondaryDark,
      backgroundColor: PALETTE.lightSurface,
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    themePillActive: {
      backgroundColor: PALETTE.primaryDark,
      borderColor: PALETTE.primaryDark,
    },
    themePillText: {
      fontSize: 14.5,
      color: PALETTE.primaryDark,
      fontWeight: '600',
    },
    themePillTextActive: {
      color: '#FFFFFF',
      fontWeight: '800',
    },
    rowDivider: {
      height: 1,
      backgroundColor: PALETTE.lightSurface,
      marginVertical: 4,
    },

    // Rodapé FROM BOILES fixado na base
    footerWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      backgroundColor: PALETTE.lightSurface,
    },
    footerBrand: {
      fontSize: 11,
      fontWeight: '800',
      color: PALETTE.secondaryDark,
      letterSpacing: 2,
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
      borderColor: PALETTE.primaryDark,
      backgroundColor: '#FFFFFF',
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
