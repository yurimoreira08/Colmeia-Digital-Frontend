import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../theme/ThemeContext';

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
          <Ionicons
            name={homeActive ? 'grid' : 'grid-outline'}
            size={22}
            color={homeActive ? colors.buttonText : colors.textMuted}
          />
          <Text style={[styles.navLabel, homeActive ? styles.navLabelActive : null]}>
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
          <Ionicons
            name={settingsActive ? 'settings' : 'settings-outline'}
            size={22}
            color={settingsActive ? colors.buttonText : colors.textMuted}
          />
          <Text style={[styles.navLabel, settingsActive ? styles.navLabelActive : null]}>
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
      paddingHorizontal: 24,
      paddingTop: 8,
      backgroundColor: 'transparent',
    },
    container: {
      height: 64,
      borderRadius: 32,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      paddingHorizontal: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    },
    navButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 24,
    },
    navButtonActive: {
      backgroundColor: colors.dockActive,
    },
    navLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textMuted,
    },
    navLabelActive: {
      color: colors.buttonText,
      fontWeight: '700',
    },
  });
}
