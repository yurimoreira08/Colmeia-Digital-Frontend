const TEST_DATA_ENABLED_KEY = 'colmeiadigital:test_data_enabled';

export async function getIsTestDataEnabled(): Promise<boolean> {
  try {
    return window.localStorage.getItem(TEST_DATA_ENABLED_KEY) === '1';
  } catch {
    return false;
  }
}

export async function setIsTestDataEnabled(enabled: boolean): Promise<void> {
  try {
    window.localStorage.setItem(TEST_DATA_ENABLED_KEY, enabled ? '1' : '0');
  } catch {
    // Ignore storage failures in constrained browser contexts.
  }
}
