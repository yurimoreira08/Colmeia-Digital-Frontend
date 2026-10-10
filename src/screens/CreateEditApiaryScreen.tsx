import React, { useCallback } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppHeader } from '../components/AppHeader';
import { useCreateEditApiary } from '../hooks/useCreateEditApiary';
import { createStyles } from './styles/CreateEditApiaryScreen.styles';
import type { RootStackParamList } from '../types/auth';
import { useVoiceCommand } from '../voice/VoiceCommandContext';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateEditApiary'>;

function formatCapitalized(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function CreateEditApiaryScreen({ navigation, route }: Props) {
  const apiaryId = route.params?.apiaryId;
  const hook = useCreateEditApiary(navigation, apiaryId);
  const styles = createStyles(hook.colors);
  const { registerScreenCommandHandler } = useVoiceCommand();

  const {
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
    saving,
    isEditing,
    handleSave,
  } = hook;

  function normalizeVoiceText(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[!?.,;:]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  useFocusEffect(
    useCallback(() => {
      const unsubscribe = registerScreenCommandHandler((transcript) => {
        const command = normalizeVoiceText(transcript);

        if (!command) {
          return false;
        }

        if (
          command.includes('fechar formulario') ||
          command.includes('cancelar cadastro') ||
          command === 'cancelar' ||
          command === 'voltar'
        ) {
          navigation.goBack();
          return true;
        }

        if (
          command.includes('salvar apiario') ||
          command.includes('finalizar cadastro') ||
          command === 'salvar' ||
          command === 'confirmar'
        ) {
          void handleSave();
          return true;
        }

        if (command.includes('limpar formulario') || command === 'limpar') {
          setName('');
          setLocation('');
          setBoxCount('');
          setDescription('');
          return true;
        }

        if (
          command.startsWith('nome ') ||
          command.startsWith('nome:') ||
          command.startsWith('apiario ') ||
          command.startsWith('nome do apiario ')
        ) {
          const raw = command
            .replace(/^nome do apiario\s*:?\s*/, '')
            .replace(/^apiario\s*:?\s*/, '')
            .replace(/^nome\s*:?\s*/, '');
          if (raw) {
            setName(formatCapitalized(raw));
            return true;
          }
        }

        if (
          command.startsWith('local ') ||
          command.startsWith('local:') ||
          command.startsWith('localizacao ') ||
          command.startsWith('endereco ')
        ) {
          const raw = command
            .replace(/^localizacao\s*:?\s*/, '')
            .replace(/^endereco\s*:?\s*/, '')
            .replace(/^local\s*:?\s*/, '');
          if (raw) {
            setLocation(formatCapitalized(raw));
            return true;
          }
        }

        if (
          command.startsWith('descricao ') ||
          command.startsWith('descricao:') ||
          command.startsWith('observacao ')
        ) {
          const raw = command
            .replace(/^observacao\s*:?\s*/, '')
            .replace(/^descricao\s*:?\s*/, '');
          if (raw) {
            setDescription(formatCapitalized(raw));
            return true;
          }
        }

        if (
          command.startsWith('caixas ') ||
          command.startsWith('quantidade ') ||
          command.startsWith('quantidade de caixas ') ||
          command.startsWith('numero de caixas ')
        ) {
          const digits = command.replace(/\D/g, '');

          if (digits.length > 0) {
            setBoxCount(digits);
            return true;
          }
        }

        return false;
      });

      return () => unsubscribe();
    }, [
      registerScreenCommandHandler,
      handleSave,
      setName,
      setLocation,
      setBoxCount,
      setDescription,
      navigation,
    ]),
  );

  return (
    <View style={styles.safeArea}>
      <AppHeader
        title={isEditing ? 'Editar Apiário' : 'Cadastrar Apiário'}
        showBack
        onPressBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          <TextInput
            style={styles.input}
            placeholder="Digite o nome do seu apiário...."
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
          />

          <TextInput
            style={styles.input}
            placeholder="Digite o local do seu apiário..."
            placeholderTextColor={colors.textMuted}
            value={location}
            onChangeText={setLocation}
          />

          <TextInput
            style={styles.input}
            placeholder="Digite a quantidade de caixas do seu apiário..."
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            value={boxCount}
            onChangeText={setBoxCount}
          />

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Digite a descrição do seu apiário (opcional)..."
            placeholderTextColor={colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            style={styles.submitButton}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.submitButtonText}>
              {saving ? 'Salvando...' : 'Finalizar cadastro'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
