import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppHeader } from '../components/AppHeader';
import { BottomDock } from '../components/BottomDock';
import { useAppTheme } from '../theme/ThemeContext';
import type { RootStackParamList } from '../types/auth';

type Props = NativeStackScreenProps<RootStackParamList, 'AboutApp'>;

export function AboutAppScreen({ navigation }: Props) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Sobre o Colmeia Digital"
        showBack
        onPressBack={() => navigation.goBack()}
        onPressBell={() => navigation.navigate('Notifications')}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>COLMEIA DIGITAL</Text>
          <Text style={styles.paragraph}>
            Sistema integrado para gestão, monitoramento e diagnóstico de apiários e caixas em campo.
          </Text>
          <Text style={styles.paragraph}>
            Arquitetura Offline-First robusta: todos os registros operacionais são persistidos localmente no dispositivo e sincronizados de forma transparente com o servidor.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Módulos Operacionais</Text>
          <Text style={styles.bullet}>• Apiários: Cadastro e gestão georreferenciada de apiários.</Text>
          <Text style={styles.bullet}>• Caixas: Mapeamento e controle de caixas ativas.</Text>
          <Text style={styles.bullet}>• Revisões: Avaliação técnica padronizada de enxames.</Text>
          <Text style={styles.bullet}>• Manejos: Registro de atividades e intervenções de campo.</Text>
          <Text style={styles.bullet}>• Relatórios: Estatísticas analíticas, métricas de crescimento e acompanhamento operacional.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Tecnologia e Segurança</Text>
          <Text style={styles.bullet}>• React Native & Expo no aplicativo móvel.</Text>
          <Text style={styles.bullet}>• SQLite local para trabalho ininterrupto sem sinal de rede.</Text>
          <Text style={styles.bullet}>• Sincronização segura com backend Node.js / Express / PostgreSQL.</Text>
        </View>

        <View style={styles.footerCard}>
          <Text style={styles.footerText}>Colmeia Digital v1.0</Text>
          <Text style={styles.footerSubtext}>Projeto FAPEPI • 2026</Text>
        </View>
      </ScrollView>

      <BottomDock
        active={null}
        onPressHome={() => navigation.replace('Home')}
        onPressSettings={() => navigation.replace('Settings')}
      />
    </SafeAreaView>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: 18,
      paddingTop: 16,
      paddingBottom: 14,
      gap: 12,
    },
    card: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: colors.card,
    },
    title: {
      fontSize: 20,
      color: colors.textPrimary,
      marginBottom: 8,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    sectionTitle: {
      fontSize: 16,
      color: colors.textPrimary,
      marginBottom: 8,
      fontWeight: '700',
    },
    paragraph: {
      fontSize: 14,
      lineHeight: 22,
      color: colors.textPrimary,
      marginBottom: 8,
    },
    bullet: {
      fontSize: 14,
      lineHeight: 22,
      color: colors.textPrimary,
      marginBottom: 4,
    },
    footerCard: {
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.surface,
      minHeight: 84,
    },
    footerText: {
      fontSize: 16,
      color: colors.textPrimary,
      fontWeight: 'bold',
    },
    footerSubtext: {
      marginTop: 2,
      fontSize: 12,
      color: colors.textMuted,
    },
  });
}
