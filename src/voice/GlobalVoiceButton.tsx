import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVoiceCommand } from './VoiceCommandContext';

// Cores da paleta oficial do Colmeia Digital
const PALETTE = {
  primaryDark: '#2C4251',     // Primária escura
  secondaryMedium: '#7798AB', // Secundária média
  secondaryLight: '#6DA6B4',  // Secundária clara
  lightBg: '#BACEE1',         // Fundo claro
  vibrantAccent: '#9FD1D4',   // Acento/vibração
  white: '#FFFFFF',
};

/**
 * Componente global responsável por exibir o Toast de feedback visual quando um comando de voz é executado.
 * O microfone em si fica padronizado exclusivamente na barra superior (AppHeader) das telas operacionais.
 */
export function GlobalVoiceButton() {
  const insets = useSafeAreaInsets();
  const { voiceFeedback } = useVoiceCommand();

  // Animação de entrada e saída do feedback visual (Toast)
  const toastAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (voiceFeedback) {
      Animated.spring(toastAnim, {
        toValue: 1,
        tension: 80,
        friction: 9,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [voiceFeedback, toastAnim]);

  if (!voiceFeedback) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.feedbackToast,
        {
          top: Math.max(insets.top + 8, 20),
          opacity: toastAnim,
          transform: [
            {
              translateY: toastAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-30, 0],
              }),
            },
            {
              scale: toastAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.85, 1],
              }),
            },
          ],
        },
      ]}
      pointerEvents="none"
    >
      <View style={styles.feedbackIconWrap}>
        <MaterialCommunityIcons name="creation" size={16} color={PALETTE.vibrantAccent} />
      </View>
      <Text style={styles.feedbackToastText}>{voiceFeedback}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  feedbackToast: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 10000,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: PALETTE.primaryDark,
    borderWidth: 1.5,
    borderColor: PALETTE.vibrantAccent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 12,
  },
  feedbackIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(159, 209, 212, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackToastText: {
    color: PALETTE.white,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
