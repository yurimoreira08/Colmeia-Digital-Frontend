import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

const CONFIG_FILE_PATH = `${FileSystem.documentDirectory}colmeia_config.json`;

interface LocalConfig {
  test_data_enabled?: boolean;
  migration_done?: boolean;
}

export async function readLocalConfig(): Promise<LocalConfig> {
  if (Platform.OS === 'web') {
    try {
      const val = localStorage.getItem('colmeia_config');
      return val ? JSON.parse(val) : {};
    } catch {
      return {};
    }
  }
  try {
    const fileInfo = await FileSystem.getInfoAsync(CONFIG_FILE_PATH);
    if (fileInfo.exists) {
      const content = await FileSystem.readAsStringAsync(CONFIG_FILE_PATH);
      return JSON.parse(content);
    }
  } catch (e) {
    console.log('[localConfig] No config file found or error reading, returning empty.');
  }
  return {};
}

export async function writeLocalConfig(config: LocalConfig): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      const current = await readLocalConfig();
      const updated = { ...current, ...config };
      localStorage.setItem('colmeia_config', JSON.stringify(updated));
    } catch (e) {
      console.error('[localConfig] Error writing to localStorage:', e);
    }
    return;
  }
  try {
    const current = await readLocalConfig();
    const updated = { ...current, ...config };
    await FileSystem.writeAsStringAsync(CONFIG_FILE_PATH, JSON.stringify(updated));
  } catch (e) {
    console.error('[localConfig] Error writing config file:', e);
  }
}

export async function getIsTestDataEnabled(): Promise<boolean> {
  const config = await readLocalConfig();
  return !!config.test_data_enabled;
}

export async function setIsTestDataEnabled(enabled: boolean): Promise<void> {
  await writeLocalConfig({ test_data_enabled: enabled });
}
export async function getIsMigrationDone(): Promise<boolean> {
  const config = await readLocalConfig();
  return !!config.migration_done;
}

export async function setIsMigrationDone(done: boolean): Promise<void> {
  await writeLocalConfig({ migration_done: done });
}
