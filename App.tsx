import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { TestDataModeProvider } from './src/config/TestDataModeContext';
import { ThemeProvider } from './src/theme/ThemeContext';
import { initSentry } from './src/config/sentry';

// Antes do primeiro render, para capturar erros desde a abertura (só com EXPO_PUBLIC_SENTRY_DSN).
initSentry();

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <ThemeProvider>
        <TestDataModeProvider>
          <AppNavigator />
        </TestDataModeProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
