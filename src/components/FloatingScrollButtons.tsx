import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVoiceCommand } from '../voice/VoiceCommandContext';
import { useAppTheme } from '../theme/ThemeContext';

type Props = {
  scrollRef: React.RefObject<ScrollView | null>;
  bottomOffset?: number;
  currentY?: number; // Opcional: para rolagem relativa mais precisa
};

export function FloatingScrollButtons({ scrollRef, bottomOffset = 16, currentY = 0 }: Props) {
  const { colors } = useAppTheme();
  const { registerScreenCommandHandler } = useVoiceCommand();

  const currentYRef = useRef(currentY);

  useEffect(() => {
    currentYRef.current = currentY;
  }, [currentY]);

  const handleScrollDown = () => {
    // Rola "um pouco" (aprox. 350px)
    scrollRef.current?.scrollTo({ y: currentYRef.current + 350, animated: true });
  };

  const handleScrollUp = () => {
    scrollRef.current?.scrollTo({ y: Math.max(0, currentYRef.current - 350), animated: true });
  };

  useEffect(() => {
    const unregister = registerScreenCommandHandler((transcript) => {
      const normalized = transcript
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[!?.,;:]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (normalized.includes('para baixo') || normalized.includes('descer')) {
        handleScrollDown();
        return true;
      }
      if (normalized.includes('para cima') || normalized.includes('subir')) {
        handleScrollUp();
        return true;
      }
      return false;
    });
    return unregister;
  }, [registerScreenCommandHandler]);

  return (
    <View style={[styles.container, { bottom: bottomOffset }]}>
      <Pressable 
        style={[
          styles.button, 
          { 
            backgroundColor: colors.accent, 
            borderColor: colors.cardBorder 
          }
        ]} 
        onPress={handleScrollUp}
        hitSlop={10}
      >
        <Ionicons name="chevron-up" size={28} color={colors.buttonText} />
      </Pressable>
      <Pressable 
        style={[
          styles.button, 
          { 
            backgroundColor: colors.accent, 
            borderColor: colors.cardBorder,
            marginTop: 10 
          }
        ]} 
        onPress={handleScrollDown}
        hitSlop={10}
      >
        <Ionicons name="chevron-down" size={28} color={colors.buttonText} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 14,
    zIndex: 99,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.5,
    elevation: 6,
  }
});
