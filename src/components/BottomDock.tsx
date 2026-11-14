import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../theme/ThemeContext';
import { PALETTE } from '../theme/themes';

/**
 * A barra tem altura fixa: com a fonte do sistema no máximo, os rótulos
 * cresceriam até sair dela. O resto do app acompanha a fonte do sistema sem limite.
 */
const DOCK_MAX_FONT_SCALE = 1.4;

type BottomDockProps = {
  active: 'home' | 'settings' | null;
  onPressHome: () => void;
  onPressSettings: () => void;
};

export function BottomDock({ active, onPressHome, onPressSettings }: BottomDockProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const homeActive = active === 'home';
  const settingsActive = active === 'settings';
  const { bottom } = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(bottom, 12) }]}>
      <View style={styles.container}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Painel Principal"
          hitSlop={8}
          onPress={onPressHome}
          style={[styles.navButton, homeActive ? styles.navButtonActive : null]}
        >
          <MaterialCommunityIcons
            name={homeActive ? 'view-dashboard' : 'view-dashboard-outline'}
            size={26}
            color={homeActive ? PALETTE.primaryDark : PALETTE.lightBg}
          />
          <Text style={[styles.navLabel, homeActive ? styles.navLabelActive : null]} maxFontSizeMultiplier={DOCK_MAX_FONT_SCALE}>
            Início
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Configurações e Perfil"
          hitSlop={8}
          onPress={onPressSettings}
          style={[styles.navButton, settingsActive ? styles.navButtonActive : null]}
        >
          <MaterialCommunityIcons
            name={settingsActive ? 'cog' : 'cog-outline'}
            size={26}
            color={settingsActive ? PALETTE.primaryDark : PALETTE.lightBg}
          />
          <Text style={[styles.navLabel, settingsActive ? styles.navLabelActive : null]} maxFontSizeMultiplier={DOCK_MAX_FONT_SCALE}>
            Configurações
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    wrapper: {
      paddingHorizontal: 20,
      paddingTop: 8,
      backgroundColor: 'transparent',
    },
    container: {
      height: 70,
      borderRadius: 35,
      borderWidth: 1.5,
      borderColor: PALETTE.secondaryLight,
      backgroundColor: PALETTE.primaryDark,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      paddingHorizontal: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 6,
    },
    navButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 12,
      paddingHorizontal: 22,
      borderRadius: 26,
    },
    navButtonActive: {
      backgroundColor: PALETTE.secondaryLight,
    },
    navLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: PALETTE.lightBg,
      letterSpacing: 0.2,
    },
    navLabelActive: {
      color: PALETTE.primaryDark,
      fontWeight: '800',
    },
  });
}
