import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { getIsTestDataEnabled, setIsTestDataEnabled as persistTestDataEnabled } from '../services/appConfigService';

type TestDataModeContextValue = {
  isTestDataEnabled: boolean;
  loading: boolean;
  saving: boolean;
  setTestDataEnabled: (enabled: boolean) => Promise<void>;
  refresh: () => Promise<void>;
};

const TestDataModeContext = createContext<TestDataModeContextValue | null>(null);

type TestDataModeProviderProps = {
  children: ReactNode;
};

export function TestDataModeProvider({ children }: TestDataModeProviderProps) {
  const [isTestDataEnabled, setIsTestDataEnabledState] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async (): Promise<void> => {
    const enabled = await getIsTestDataEnabled();
    setIsTestDataEnabledState(enabled);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function load(): Promise<void> {
      try {
        const enabled = await getIsTestDataEnabled();

        if (mounted) {
          setIsTestDataEnabledState(enabled);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  const setTestDataEnabled = useCallback(async (enabled: boolean): Promise<void> => {
    const previous = isTestDataEnabled;
    setIsTestDataEnabledState(enabled);
    setSaving(true);

    try {
      await persistTestDataEnabled(enabled);
    } catch {
      setIsTestDataEnabledState(previous);
      throw new Error('Falha ao salvar configuracao de dados de teste.');
    } finally {
      setSaving(false);
    }
  }, [isTestDataEnabled]);

  const value = useMemo<TestDataModeContextValue>(() => {
    return {
      isTestDataEnabled,
      loading,
      saving,
      setTestDataEnabled,
      refresh,
    };
  }, [isTestDataEnabled, loading, refresh, saving, setTestDataEnabled]);

  return <TestDataModeContext.Provider value={value}>{children}</TestDataModeContext.Provider>;
}

export function useTestDataMode(): TestDataModeContextValue {
  const context = useContext(TestDataModeContext);

  if (!context) {
    throw new Error('useTestDataMode must be used within TestDataModeProvider.');
  }

  return context;
}