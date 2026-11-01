import { useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppHeader } from '../components/AppHeader';
import { BottomDock } from '../components/BottomDock';
import { useAppTheme } from '../theme/ThemeContext';
import { PALETTE } from '../theme/themes';
import type { RootStackParamList } from '../types/auth';
import { useVoiceCommand } from '../voice/VoiceCommandContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

type ModuleAction = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  route: keyof RootStackParamList;
  accentColor: string;
};

export function HomeScreen({ navigation }: Props) {
  const cardsAnim = useRef(new Animated.Value(0)).current;
  const { colors } = useAppTheme();
  const { registerScreenCommandHandler } = useVoiceCommand();
  const styles = createStyles(colors);

  useEffect(() => {
    Animated.timing(cardsAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [cardsAnim]);

  useFocusEffect(
    useCallback(() => {
      const unsubscribe = registerScreenCommandHandler((transcript) => {
        const command = transcript
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[!?.,;:]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (!command) return false;

        if (command.includes('configuracoes') || command.includes('ajustes')) {
          navigation.replace('Settings');
          return true;
        }

        if (command.includes('notificacoes')) {
          navigation.navigate('Notifications');
          return true;
        }

        if (command.includes('apiario') || command.includes('apiarios')) {
          navigation.navigate('ApiaryList');
          return true;
        }

        if (command.includes('colmeia') || command.includes('caixa') || command.includes('caixas')) {
          navigation.navigate('BoxesList');
          return true;
        }

        if (command.includes('inspecao') || command.includes('revisao') || command.includes('revisoes')) {
          navigation.navigate('RevisionList');
          return true;
        }

        if (command.includes('manejo') || command.includes('manejos')) {
          navigation.navigate('ManejoList');
          return true;
        }

        if (command.includes('relatorio') || command.includes('relatorios')) {
          navigation.navigate('Reports');
          return true;
        }

        return false;
      });

      return () => {
        unsubscribe();
      };
    }, [navigation, registerScreenCommandHandler]),
  );

  const modules: ModuleAction[] = [
    {
      id: 'apiaries',
      title: 'Apiários',
      subtitle: 'Cadastro e gestão de apiários e locais',
      icon: 'beehive-outline',
      route: 'ApiaryList',
      accentColor: PALETTE.primaryDark,
    },
    {
      id: 'boxes',
      title: 'Caixas',
      subtitle: 'Mapeamento e controle de colmeias',
      icon: 'cube-outline',
      route: 'BoxesList',
      accentColor: PALETTE.secondaryLight,
    },
    {
      id: 'revisions',
      title: 'Revisão',
      subtitle: 'Avaliação periódica e saúde do enxame',
      icon: 'clipboard-text-outline',
      route: 'RevisionList',
      accentColor: PALETTE.primaryDark,
    },
    {
      id: 'manejos',
      title: 'Manejo',
      subtitle: 'Alimentação, divisões e intervenções',
      icon: 'tools',
      route: 'ManejoList',
      accentColor: PALETTE.secondaryLight,
    },
    {
      id: 'reports',
      title: 'Relatórios',
      subtitle: 'Estatísticas, análises e acompanhamento',
      icon: 'chart-box-outline',
      route: 'Reports',
      accentColor: PALETTE.secondaryDark,
    },
  ];

  return (
    <View style={styles.safeArea}>
      <AppHeader
        title="Colmeia Digital"
        onPressBell={() => navigation.navigate('Notifications')}
        showNotificationIcon={true}
        showMic={true}
      />

      <ScrollView 
        style={styles.contentArea} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.modulesContainer}>
          {modules.map((item, index) => (
            <Animated.View
              key={item.id}
              style={{
                opacity: cardsAnim,
                transform: [
                  {
                    translateY: cardsAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [14 + index * 5, 0],
                    }),
                  },
                ],
              }}
            >
              <Pressable
                style={({ pressed }) => [
                  styles.moduleCard,
                  pressed ? styles.moduleCardPressed : null,
                ]}
                onPress={() => {
                  navigation.navigate(item.route as any);
                }}
              >
                <View style={[styles.iconContainer, { backgroundColor: item.accentColor + '18' }]}>
                  <MaterialCommunityIcons name={item.icon} size={30} color={item.accentColor} />
                </View>

                <View style={styles.moduleInfo}>
                  <Text style={styles.moduleTitle}>{item.title}</Text>
                  <Text style={styles.moduleSubtitle} numberOfLines={1}>{item.subtitle}</Text>
                </View>

                <View style={styles.arrowBadge}>
                  <MaterialCommunityIcons name="chevron-right" size={22} color={PALETTE.secondaryDark} />
                </View>
              </Pressable>
            </Animated.View>
          ))}
        </View>
      </ScrollView>

      <BottomDock
        active="home"
        onPressHome={() => undefined}
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
    contentArea: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingTop: 18,
      paddingHorizontal: 16,
      paddingBottom: 28,
      justifyContent: 'space-around',
    },
    modulesContainer: {
      gap: 14,
      flex: 1,
      justifyContent: 'space-between',
    },
    moduleCard: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 18,
      paddingHorizontal: 18,
      backgroundColor: '#FFFFFF',
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: PALETTE.secondaryLight,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    moduleCardPressed: {
      backgroundColor: PALETTE.lightSurface,
      transform: [{ scale: 0.985 }],
    },
    iconContainer: {
      width: 56,
      height: 56,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    moduleInfo: {
      flex: 1,
      gap: 4,
    },
    moduleTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: PALETTE.primaryDark,
      letterSpacing: 0.2,
    },
    moduleSubtitle: {
      fontSize: 13,
      color: PALETTE.secondaryDark,
      lineHeight: 18,
      fontWeight: '500',
    },
    arrowBadge: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: PALETTE.lightSurface,
      borderWidth: 1,
      borderColor: PALETTE.secondaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 10,
    },
  });
}
