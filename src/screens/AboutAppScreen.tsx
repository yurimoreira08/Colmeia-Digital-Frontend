import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppHeader } from '../components/AppHeader';
import { BottomDock } from '../components/BottomDock';
import { useAppTheme } from '../theme/ThemeContext';
import { PALETTE } from '../theme/themes';
import type { RootStackParamList } from '../types/auth';

type Props = NativeStackScreenProps<RootStackParamList, 'AboutApp'>;

export function AboutAppScreen({ navigation }: Props) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.safeArea}>
      <AppHeader
        title="Sobre o Aplicativo"
        showBack
        onPressBack={() => navigation.goBack()}
        onPressBell={() => navigation.navigate('Notifications')}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.title}>COLMEIA DIGITAL</Text>
          <Text style={styles.paragraph}>
            Sistema integrado de alta performance para gestão, monitoramento e diagnóstico inteligente de apiários e caixas em campo.
          </Text>
          <Text style={styles.paragraph}>
            Arquitetura Offline-First robusta: todos os registros operacionais são persistidos localmente no dispositivo e sincronizados de forma transparente e segura com o servidor na nuvem.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Módulos Operacionais</Text>
          <Text style={styles.bullet}>• Apiários: Cadastro e gestão georreferenciada de apiários com controle de permissões.</Text>
          <Text style={styles.bullet}>• Caixas: Mapeamento detalhado e controle individual de caixas ativas.</Text>
          <Text style={styles.bullet}>• Revisões: Avaliação técnica padronizada de enxames com registro de postura e crias.</Text>
          <Text style={styles.bullet}>• Manejos: Registro de intervenções técnicas, alimentação, divisão e fotos comprovatórias.</Text>
          <Text style={styles.bullet}>• Relatórios: Estatísticas analíticas, métricas de crescimento e acompanhamento histórico.</Text>
          <Text style={styles.bullet}>• Comandos de Voz: Operação em campo com as mãos livres sem precisar retirar as luvas.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Tecnologia e Segurança</Text>
          <Text style={styles.bullet}>• React Native & Expo no aplicativo móvel com tipografia moderna Inter.</Text>
          <Text style={styles.bullet}>• SQLite local para trabalho ininterrupto em áreas remotas sem sinal de internet.</Text>
          <Text style={styles.bullet}>• Sincronização segura com backend Node.js, Express e banco de dados PostgreSQL.</Text>
        </View>

        <View style={styles.footerCard}>
          <Text style={styles.footerText}>Colmeia Digital v2.0</Text>
          <Text style={styles.footerSubtext}>Projeto FAPEPI • 2026</Text>
          <Text style={styles.fromBoiles}>FROM BOILES</Text>
        </View>
      </ScrollView>

      <BottomDock
        active={null}
        onPressHome={() => navigation.replace('Home')}
        onPressSettings={() => navigation.replace('Settings')}
      />
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: PALETTE.lightSurface,
    },
    content: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 28,
      gap: 14,
    },
    card: {
      borderWidth: 1.5,
      borderColor: PALETTE.secondaryLight,
      borderRadius: 18,
      paddingHorizontal: 18,
      paddingVertical: 18,
      backgroundColor: '#FFFFFF',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 2,
    },
    title: {
      fontSize: 22,
      color: PALETTE.primaryDark,
      marginBottom: 10,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    sectionTitle: {
      fontSize: 18,
      color: PALETTE.primaryDark,
      marginBottom: 10,
      fontWeight: '800',
    },
    paragraph: {
      fontSize: 15,
      lineHeight: 23,
      color: PALETTE.primaryDark,
      marginBottom: 8,
      fontWeight: '500',
    },
    bullet: {
      fontSize: 14.5,
      lineHeight: 23,
      color: PALETTE.primaryDark,
      marginBottom: 6,
      fontWeight: '500',
    },
    footerCard: {
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: PALETTE.secondaryLight,
      backgroundColor: '#FFFFFF',
      paddingVertical: 20,
      paddingHorizontal: 16,
      gap: 6,
    },
    footerText: {
      fontSize: 18,
      color: PALETTE.primaryDark,
      fontWeight: '800',
    },
    footerSubtext: {
      fontSize: 13,
      color: PALETTE.secondaryDark,
      fontWeight: '600',
    },
    fromBoiles: {
      fontSize: 11,
      fontWeight: '800',
      color: PALETTE.secondaryDark,
      letterSpacing: 2,
      marginTop: 4,
    },
  });
}
