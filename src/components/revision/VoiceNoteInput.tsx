import React from 'react';
import { Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import type { BoxReviewStyles } from '../../screens/styles/BoxReviewScreen.styles';
import { PALETTE } from '../../theme/themes';

type Props = {
  label: string;
  placeholder: string;
  placeholderColor: string;
  value: string;
  /** Texto ditado ainda não confirmado pelo reconhecimento de voz. */
  preview: string;
  /** O microfone está escrevendo neste campo. */
  isDictating: boolean;
  onChangeText: (value: string) => void;
  onFocus: () => void;
  onLayout: (y: number) => void;
  styles: BoxReviewStyles;
};

/** Campo de anotação que aceita teclado e ditado por voz. */
export function VoiceNoteInput({ label, placeholder, placeholderColor, value, preview, isDictating, onChangeText, onFocus, onLayout, styles }: Props) {
  return (
    <View style={styles.textAreaCard} onLayout={(e) => onLayout(e.nativeEvent.layout.y)}>
      <View style={styles.fieldHeader}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {isDictating ? (
          <View style={styles.voiceFieldBadge}>
            <MaterialCommunityIcons name="microphone" size={14} color={PALETTE.primaryDark} />
            <Text style={styles.voiceFieldBadgeText}>Ouvindo...</Text>
          </View>
        ) : null}
      </View>
      <TextInput
        style={styles.textArea}
        multiline
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={placeholderColor}
        onFocus={onFocus}
      />
      {preview ? <Text style={styles.voicePreview}>🎤 {preview}</Text> : null}
    </View>
  );
}
