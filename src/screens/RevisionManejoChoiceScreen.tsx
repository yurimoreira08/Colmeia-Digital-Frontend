import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppHeader } from '../components/AppHeader';
import { BottomDock } from '../components/BottomDock';
import { useAppTheme } from '../theme/ThemeContext';
import { PALETTE } from '../theme/themes';
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
          accessibilityRole="button"
          style={styles.choiceCard}
          onPress={() => navigation.navigate('RevisionList')}
        >
          <View style={[styles.iconWrap, { backgroundColor: PALETTE.primaryDark }]}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={32} color="#FFFFFF" />
          </View>
          <View style={styles.textWrap}>
            <Text style={styles.choiceTitle}>Revisão Periódica</Text>
            <Text style={styles.choiceSubtitle}>Avaliação de rainha, postura, crias, mel e pólen</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={28} color={PALETTE.secondaryMedium} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          style={styles.choiceCard}
          onPress={() => navigation.navigate('ManejoList')}
        >
          <View style={[styles.iconWrap, { backgroundColor: PALETTE.secondaryLight }]}>
            <MaterialCommunityIcons name="tools" size={32} color="#FFFFFF" />
          </View>
          <View style={styles.textWrap}>
            <Text style={styles.choiceTitle}>Manejo Técnico</Text>
            <Text style={styles.choiceSubtitle}>Alimentação, divisão de enxame, cera e intervenções</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={28} color={PALETTE.secondaryMedium} />
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
      color: PALETTE.mutedText,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 4,
    },
    choiceCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 20,
      minHeight: 90,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: PALETTE.secondaryMedium + '40',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
      gap: 16,
    },
    iconWrap: {
      width: 58,
      height: 58,
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
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 4,
      lineHeight: 19,
    },
  });
}
