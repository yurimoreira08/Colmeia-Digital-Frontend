import { StatusBar } from 'expo-status-bar';
import { AppNavigator } from './src/navigation/AppNavigator';
import { TestDataModeProvider } from './src/config/TestDataModeContext';
import { ThemeProvider } from './src/theme/ThemeContext';

export default function App() {
  return (
    <>
      <StatusBar style="dark" />
      <ThemeProvider>
        <TestDataModeProvider>
          <AppNavigator />
        </TestDataModeProvider>
      </ThemeProvider>
    </>
  );
}
