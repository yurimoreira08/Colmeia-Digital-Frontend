import React, { useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import { useAppTheme } from '../theme/ThemeContext';
import { apiRequest } from '../services/apiClient';
import { Ionicons } from '@expo/vector-icons';
import { ConfirmModal } from './ConfirmModal';

interface ShareApiaryModalProps {
  visible: boolean;
  apiaryId: number;
  apiaryName: string;
  onClose: () => void;
}

export function ShareApiaryModal({ visible, apiaryId, apiaryName, onClose }: ShareApiaryModalProps) {
  const { colors } = useAppTheme();
  const [role, setRole] = useState<'reader' | 'editor'>('reader');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successModalVisible, setSuccessModalVisible] = useState(false);

  async function handleShare() {
    if (!username.trim()) {
      setError('Por favor, informe o nome de usuário.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiRequest(`/apiaries/${apiaryId}/share`, 'POST', {
        username: username.trim(),
        role,
      });

      setSuccessModalVisible(true);
    } catch (err: any) {
      console.error('[Share] Falha ao compartilhar:', err);
      setError(err.message || 'Erro ao enviar convite.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Compartilhar Apiário</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>{apiaryName}</Text>

          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Convidar Usuário (Nome Completo):</Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.textPrimary,
                  borderColor: colors.cardBorder,
                  backgroundColor: colors.background,
                },
              ]}
              value={username}
              onChangeText={(txt) => {
                setUsername(txt);
                setError(null);
              }}
              placeholder="Nome do usuário..."
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
            />
            {error ? <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text> : null}
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Escolha a Permissão:</Text>
            
            <View style={styles.roleContainer}>
              <Pressable
                style={[
                  styles.roleOption,
                  { borderColor: colors.cardBorder, backgroundColor: colors.background },
                  role === 'reader' && { backgroundColor: colors.accent, borderColor: colors.accent }
                ]}
                onPress={() => setRole('reader')}
              >
                <Ionicons name="eye-outline" size={20} color={colors.textPrimary} />
                <Text style={[styles.roleText, { color: colors.textPrimary }]}>Leitor</Text>
                <Text style={styles.roleSubtext}>Apenas visualização</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.roleOption,
                  { borderColor: colors.cardBorder, backgroundColor: colors.background },
                  role === 'editor' && { backgroundColor: colors.accent, borderColor: colors.accent }
                ]}
                onPress={() => setRole('editor')}
              >
                <Ionicons name="create-outline" size={20} color={colors.textPrimary} />
                <Text style={[styles.roleText, { color: colors.textPrimary }]}>Editor</Text>
                <Text style={styles.roleSubtext}>Cadastrar manejos</Text>
              </Pressable>
            </View>
          </View>

          <Pressable 
            style={[styles.shareBtn, { backgroundColor: colors.buttonBackground }]} 
            onPress={handleShare} 
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.buttonText} />
            ) : (
              <Text style={[styles.shareBtnText, { color: colors.buttonText }]}>Enviar Convite</Text>
            )}
          </Pressable>

          <Pressable style={styles.closeBtn} onPress={onClose} disabled={loading}>
            <Text style={{ color: colors.textMuted, fontWeight: '600' }}>Cancelar</Text>
          </Pressable>
        </View>
      </View>

      <ConfirmModal
        visible={successModalVisible}
        title="Convite Enviado"
        message={`Convite enviado com sucesso para "${username.trim()}"!`}
        confirmLabel="OK"
        hideCancel
        onConfirm={() => {
          setSuccessModalVisible(false);
          setUsername('');
          onClose();
        }}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    justifyContent: 'center', 
    alignItems: 'center',
    padding: 20
  },
  container: { 
    width: '100%', 
    maxWidth: 360,
    padding: 22, 
    borderRadius: 16, 
    borderWidth: 1.5, 
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
  },
  title: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    textAlign: 'center' 
  },
  subtitle: { 
    fontSize: 14, 
    textAlign: 'center', 
    marginTop: -10,
    fontWeight: '600'
  },
  section: {
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
  },
  input: {
    height: 48,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: -4,
  },
  roleContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    gap: 10,
  },
  roleOption: { 
    flex: 1,
    paddingVertical: 12, 
    paddingHorizontal: 10, 
    borderRadius: 12, 
    borderWidth: 1.5, 
    alignItems: 'center',
    gap: 4
  },
  roleText: {
    fontSize: 15,
    fontWeight: 'bold'
  },
  roleSubtext: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center'
  },
  shareBtn: { 
    paddingVertical: 14, 
    borderRadius: 12, 
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8
  },
  shareBtnText: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  closeBtn: { 
    padding: 6, 
    alignItems: 'center' 
  },
});
