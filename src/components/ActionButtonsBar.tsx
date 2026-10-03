import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../theme/ThemeContext';

interface ActionButtonsBarProps {
  onArchive: () => void;
  onDownload?: () => void;
  isArchived?: boolean;
}

export function ActionButtonsBar({ onArchive, onDownload, isArchived }: ActionButtonsBarProps) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.container}>
      {onDownload && (
        <Pressable style={styles.button} onPress={onDownload} hitSlop={8}>
          <Ionicons name="download-outline" size={20} color={colors.accent} />
        </Pressable>
      )}
      <Pressable style={styles.button} onPress={onArchive} hitSlop={8}>
        <Ionicons
          name={isArchived ? 'refresh-outline' : 'archive-outline'}
          size={20}
          color={colors.accent}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  button: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
