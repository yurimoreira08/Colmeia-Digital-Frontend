import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAppTheme } from '../theme/ThemeContext';
import type { AppThemeColors } from '../theme/themes';

type Props = {
  visible: boolean;
  onCancel: () => void;
  /** Exclui a conta; lança erro com a mensagem para o usuário (ex.: "Senha incorreta."). */
  onConfirm: (password: string) => Promise<void>;
};

/**
 * Confirmação da exclusão da conta (LGPD). Explica o que será apagado e
 * pede a senha: é uma ação sem volta, e a senha garante que é o dono da
 * conta quem pede. A senha vai como foi digitada (sem trim).
 */
export function DeleteAccountModal({ visible, onCancel, onConfirm }: Props) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  function close() {
    setPassword('');
    setError(null);
    onCancel();
  }

  async function confirm() {
    setDeleting(true);
    setError(null);
    try {
      await onConfirm(password);
      setPassword('');
    } catch (err: any) {
      setError(err?.message || 'Não foi possível excluir a conta. Tente de novo.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title} accessibilityRole="header">Excluir minha conta</Text>
          <Text style={styles.message}>
            Seus apiários, caixas, revisões, manejos e fotos serão apagados do servidor e deste aparelho. Não dá para desfazer.
          </Text>
          <Text style={styles.message}>Se quiser guardar uma cópia, use antes "Exportar meus dados".</Text>

          <Text style={styles.label}>Digite sua senha para confirmar</Text>
          <TextInput
            accessibilityLabel="Senha para confirmar a exclusão"
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!deleting}
            placeholder="Senha"
            placeholderTextColor={colors.textMuted}
          />
          {error ? (
            <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text>
          ) : null}

          <View style={styles.actions}>
            <Pressable accessibilityRole="button" style={styles.cancelButton} onPress={close} disabled={deleting}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !password || deleting, busy: deleting }}
              style={[styles.deleteButton, !password || deleting ? styles.deleteButtonDisabled : null]}
              onPress={() => void confirm()}
              disabled={!password || deleting}
            >
              {deleting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.deleteText}>Excluir conta</Text>}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.45)', justifyContent: 'center', paddingHorizontal: 24 },
    card: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder, padding: 20, gap: 10 },
    title: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary, textAlign: 'center' },
    message: { fontSize: 15, lineHeight: 22, color: colors.textPrimary },
    label: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginTop: 4 },
    input: {
      minHeight: 50,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 10,
      paddingHorizontal: 14,
      fontSize: 16,
      color: colors.textPrimary,
      backgroundColor: colors.inputBackground,
    },
    error: { fontSize: 14, fontWeight: '600', color: colors.error },
    actions: { flexDirection: 'row', gap: 12, marginTop: 6 },
    cancelButton: {
      flex: 1,
      minHeight: 50,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelText: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
    deleteButton: { flex: 1, minHeight: 50, borderRadius: 12, backgroundColor: '#B91C1C', alignItems: 'center', justifyContent: 'center' },
    deleteButtonDisabled: { opacity: 0.5 },
    deleteText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  });
}
