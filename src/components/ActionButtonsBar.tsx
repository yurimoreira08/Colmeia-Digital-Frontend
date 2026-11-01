import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PALETTE } from '../theme/themes';

interface ActionButtonsBarProps {
  onArchive: () => void;
  onDownload?: () => void;
  isArchived?: boolean;
}

export function ActionButtonsBar({ onArchive, onDownload, isArchived }: ActionButtonsBarProps) {
  return (
    <View style={styles.container}>
      {onDownload && (
        <Pressable style={styles.button} onPress={onDownload} hitSlop={8}>
          <MaterialCommunityIcons name="download-outline" size={20} color={PALETTE.primaryDark} />
        </Pressable>
      )}
      <Pressable style={styles.button} onPress={onArchive} hitSlop={8}>
        <MaterialCommunityIcons
          name={isArchived ? 'package-up' : 'archive-arrow-down-outline'}
          size={20}
          color={PALETTE.primaryDark}
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
