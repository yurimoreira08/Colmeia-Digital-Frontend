import { getLocalConfigValue, setLocalConfigValue } from './localDbService';
import { triggerSyncBackground } from './syncService';

export async function getIsTestDataEnabled(): Promise<boolean> {
  const val = await getLocalConfigValue('test_data_enabled');
  return val === 'true';
}

export async function setIsTestDataEnabled(enabled: boolean): Promise<void> {
  await setLocalConfigValue('test_data_enabled', String(enabled));
  triggerSyncBackground();
}
