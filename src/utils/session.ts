import { AppState, AppStateStatus } from 'react-native';
import { toLocalISOString } from './date';

/**
 * APP_SESSION_START holds the ISO timestamp of when the JS module was first loaded.
 * This effectively tracks the start of the current app session in memory.
 * It resets automatically when the app process is terminated and restarted.
 * We reset it on app backgrounding to clear recently modified indicators.
 */
export let APP_SESSION_START = toLocalISOString();

export function resetAppSessionStart() {
  APP_SESSION_START = toLocalISOString();
}

AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
  if (nextAppState === 'background') {
    resetAppSessionStart();
  }
});

