import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppHeader } from '../components/AppHeader';
import { BottomDock } from '../components/BottomDock';
import { useAppTheme } from '../theme/ThemeContext';
import type { RootStackParamList } from '../types/auth';
import { useVoiceCommand } from '../voice/VoiceCommandContext';

type Props = NativeStackScreenProps<RootStackParamList, 'RevisionManejoChoice'>;

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

export function RevisionManejoChoiceScreen({ navigation }: Props) {
  const { colors } = useAppTheme();
  const { registerScreenCommandHandler } = useVoiceCommand();
  const styles = createStyles(colors);

  useFocusEffect(
    useCallback(() => {
      const unsubscribe = registerScreenCommandHandler((transcript) => {
        const cmd = normalize(transcript);
        if (cmd.includes('inspecao') || cmd.includes('revisao')) {
          navigation.navigate('RevisionList');
          return true;
        }
        if (cmd.includes('manejo')) {
          navigation.navigate('ManejoList');
          return true;
        }
        return false;
      });
      return unsubscribe;
    }, [navigation, registerScreenCommandHandler])
  );

  return (
    <View style={styles.safeArea}>
      <AppHeader
        title="Operações de Campo"
        showBack
        onPressBack={() => navigation.goBack()}
        onPressBell={() => navigation.navigate('Notifications')}
        showMic={true}
      />

      <View style={styles.content}>
        <Text style={styles.instructionText}>Selecione o tipo de registro operacional:</Text>

        <Pressable
          style={styles.choiceCard}
          onPress={() => navigation.navigate('RevisionList')}
        >
          <View style={[styles.iconWrap, { backgroundColor: '#E0F2F1' }]}>
            <Ionicons name="clipboard-outline" size={32} color={colors.headerBackground} />
          </View>
          <View style={styles.textWrap}>
            <Text style={styles.choiceTitle}>Revisão Periódica</Text>
            <Text style={styles.choiceSubtitle}>Avaliação de rainha, postura, crias, mel e pólen</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.textMuted} />
        </Pressable>

        <Pressable
          style={styles.choiceCard}
          onPress={() => navigation.navigate('ManejoList')}
        >
          <View style={[styles.iconWrap, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="construct-outline" size={32} color={colors.warmAccent} />
          </View>
          <View style={styles.textWrap}>
            <Text style={styles.choiceTitle}>Manejo Técnico</Text>
            <Text style={styles.choiceSubtitle}>Alimentação, divisão de enxame, cera e intervenções</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.textMuted} />
        </Pressable>
      </View>

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
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 20,
      gap: 16,
    },
    instructionText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 4,
    },
    choiceCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 20,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
      gap: 16,
    },
    iconWrap: {
      width: 56,
      height: 56,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    textWrap: {
      flex: 1,
    },
    choiceTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    choiceSubtitle: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 4,
      lineHeight: 18,
    },
  });
}
