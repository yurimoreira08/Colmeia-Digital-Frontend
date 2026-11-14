import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { triggerSyncBackground, type SyncStatus } from '../services/syncService';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export type SyncStatusView = {
  icon: IconName;
  /** Texto lido pelo leitor de tela: diz o estado e o que o toque faz. */
  label: string;
  /** Alterações ainda não enviadas (0 esconde o contador). */
  pendingCount: number;
};

function changes(count: number): string {
  return count === 1 ? '1 alteração' : `${count} alterações`;
}

/**
 * Traduz o estado do sync para o que o cabeçalho mostra.
 *
 * Ordem de prioridade: sincronizando > falha com pendências > pendências >
 * tudo enviado. Uma falha antiga sem pendências não é mostrada: os dados já
 * estão no servidor.
 */
export function describeSyncStatus(status: SyncStatus | null): SyncStatusView | null {
  if (!status) return null;
  const pendingCount = status.unsyncedCount;

  if (status.isSyncing) {
    return { icon: 'cloud-sync-outline', label: 'Sincronizando dados com o servidor', pendingCount };
  }
  if (pendingCount > 0 && status.lastError) {
    return {
      icon: 'cloud-alert-outline',
      label: `Não foi possível enviar ${changes(pendingCount)}. Toque para tentar de novo.`,
      pendingCount,
    };
  }
  if (pendingCount > 0) {
    return {
      icon: 'cloud-upload-outline',
      label: `${changes(pendingCount)} aguardando envio. Toque para enviar agora.`,
      pendingCount,
    };
  }
  return { icon: 'cloud-check-outline', label: 'Tudo sincronizado com o servidor', pendingCount: 0 };
}

/**
 * Botão do cabeçalho com o estado do sync. O toque pede uma sincronização
 * (sem efeito se já estiver sincronizando ou sem conexão: os dados continuam
 * salvos no aparelho).
 */
export function SyncStatusButton() {
  const view = describeSyncStatus(useSyncStatus());
  if (!view) return null;

  const isSyncing = view.icon === 'cloud-sync-outline';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={view.label}
      accessibilityState={{ busy: isSyncing, disabled: isSyncing }}
      disabled={isSyncing}
      hitSlop={8}
      onPress={triggerSyncBackground}
      style={styles.button}
    >
      <MaterialCommunityIcons name={view.icon} size={22} color="#FFFFFF" />
      {view.pendingCount > 0 ? (
        <View style={styles.counter} importantForAccessibility="no-hide-descendants">
          <Text style={styles.counterText} maxFontSizeMultiplier={1.3}>
            {view.pendingCount > 99 ? '99+' : view.pendingCount}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Mesmo tamanho e fundo dos outros botões do AppHeader.
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  // Contador cor de mel com texto escuro (contraste acima de 4,5:1).
  counter: {
    position: 'absolute',
    top: -2,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5B700',
  },
  counterText: {
    color: '#2C4251',
    fontSize: 11,
    fontWeight: '700',
  },
});
