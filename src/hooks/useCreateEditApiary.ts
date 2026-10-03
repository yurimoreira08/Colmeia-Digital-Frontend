import { useEffect, useState } from 'react';
import { loadApiary, saveApiary } from '../services/apiaryService';
import { useAppTheme } from '../theme/ThemeContext';

export function useCreateEditApiary(navigation: any, apiaryId?: number) {
  const { colors } = useAppTheme();
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [boxCount, setBoxCount] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isEditing = !!apiaryId;

  useEffect(() => {
    if (apiaryId) {
      setError(null);
      loadApiary(apiaryId)
        .then((data) => {
          if (data) {
            setName(data.name);
            setLocation(data.location);
            setBoxCount(String(data.boxCount));
            setDescription(data.description);
          } else {
            setError('Apiário não encontrado para edição.');
          }
        })
        .catch(() => {
          setError('Erro ao carregar dados do apiário.');
        });
    }
  }, [apiaryId]);

  async function handleSave(): Promise<void> {
    if (saving) return;
    if (!name || name.trim().length < 2) {
      setError('Informe o nome do apiário.');
      return;
    }
    if (!location || location.trim().length < 2) {
      setError('Informe o local do apiário.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await saveApiary({
        id: apiaryId ?? undefined,
        name,
        location,
        boxCount,
        description,
      });

      navigation.goBack();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao salvar apiário.';
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return {
    colors,
    name,
    setName,
    location,
    setLocation,
    boxCount,
    setBoxCount,
    description,
    setDescription,
    error,
    setError,
    saving,
    isEditing,
    handleSave,
  };
}
