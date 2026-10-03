import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '../theme/ThemeContext';

export interface PhotoOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectCamera: () => void;
  onSelectGallery: () => void;
  onRemovePhoto?: () => void;
  hasPhoto?: boolean;
}

export function PhotoOptionsModal({
  visible,
  onClose,
  onSelectCamera,
  onSelectGallery,
  onRemovePhoto,
  hasPhoto = false,
}: PhotoOptionsModalProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.sheet} onStartShouldSetResponder={() => true}>
          <View style={styles.dragIndicator} />
          
          <Text style={styles.title}>Selecionar Foto</Text>
          
          <View style={styles.optionsContainer}>
            <Pressable
              style={styles.optionButton}
              onPress={() => {
                onClose();
                onSelectCamera();
              }}
            >
              <View style={[styles.iconWrapper, { backgroundColor: colors.accentSoft }]}>
                <Ionicons name="camera-outline" size={24} color={colors.accent} />
              </View>
              <Text style={styles.optionText}>Tirar Foto Agora</Text>
            </Pressable>

            <Pressable
              style={styles.optionButton}
              onPress={() => {
                onClose();
                onSelectGallery();
              }}
            >
              <View style={[styles.iconWrapper, { backgroundColor: colors.accentSoft }]}>
                <Ionicons name="images-outline" size={24} color={colors.accent} />
              </View>
              <Text style={styles.optionText}>Escolher da Galeria</Text>
            </Pressable>

            {hasPhoto && onRemovePhoto ? (
              <Pressable
                style={styles.optionButton}
                onPress={() => {
                  onClose();
                  onRemovePhoto();
                }}
              >
                <View style={[styles.iconWrapper, { backgroundColor: '#FFEBEE' }]}>
                  <Ionicons name="trash-outline" size={24} color="#C62828" />
                </View>
                <Text style={[styles.optionText, { color: '#C62828' }]}>Remover Foto Atual</Text>
              </Pressable>
            ) : null}
          </View>

          <Pressable style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 24,
      paddingTop: 14,
      paddingBottom: 32,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    dragIndicator: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.cardBorder,
      alignSelf: 'center',
      marginBottom: 20,
    },
    title: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: 24,
    },
    optionsContainer: {
      gap: 16,
      marginBottom: 24,
    },
    optionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 14,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    iconWrapper: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    optionText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    cancelButton: {
      height: 52,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelButtonText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
  });
}
