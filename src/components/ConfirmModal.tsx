import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../theme/ThemeContext';

export interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  hideCancel?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  isDestructive = false,
  hideCancel = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.actions}>
            {!hideCancel && (
              <Pressable style={styles.cancelButton} onPress={onCancel}>
                <Text style={styles.cancelText}>{cancelLabel}</Text>
              </Pressable>
            )}

            <Pressable
              style={[styles.confirmButton, isDestructive && styles.confirmDestructive]}
              onPress={onConfirm}
            >
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
      justifyContent: 'center',
      paddingHorizontal: 28,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingHorizontal: 20,
      paddingVertical: 24,
      gap: 12,
    },
    title: {
      fontSize: 20,
      color: colors.textPrimary,
      textAlign: 'center',
      fontWeight: 'bold',
    },
    message: {
      fontSize: 15,
      color: colors.textPrimary,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 8,
      fontWeight: '500',
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
      marginTop: 4,
    },
    cancelButton: {
      flex: 1,
      height: 50,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelText: {
      fontSize: 15,
      color: colors.textPrimary,
      fontWeight: '600',
    },
    confirmButton: {
      flex: 1,
      height: 50,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    confirmDestructive: {
      backgroundColor: colors.error,
      borderColor: colors.error,
    },
    confirmText: {
      fontSize: 15,
      color: '#FFFFFF',
      fontWeight: '600',
    },
  });
}
