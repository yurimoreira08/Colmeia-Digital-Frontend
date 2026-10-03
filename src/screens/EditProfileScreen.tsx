import React, { useState, useEffect } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { AppHeader } from '../components/AppHeader';
import { ConfirmModal } from '../components/ConfirmModal';
import { getCurrentUser, updateProfile } from '../services/authService';
import { getLocalConfigValue, setLocalConfigValue } from '../services/localDbService';
import { uploadImageToServer } from '../services/storageService';
import { useAppTheme } from '../theme/ThemeContext';
import type { RootStackParamList, User } from '../types/auth';

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;

export function EditProfileScreen({ navigation }: Props) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          setName(currentUser.name);
          setEmail(currentUser.email);
          
          if (currentUser.photo) {
            setPhotoUri(currentUser.photo);
            await setLocalConfigValue(`profile_photo_${currentUser.id}`, currentUser.photo);
          } else {
            const savedPhoto = await getLocalConfigValue(`profile_photo_${currentUser.id}`);
            setPhotoUri(savedPhoto || null);
          }
        }
      } catch (err) {
        console.error('Falha ao carregar dados do perfil:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  async function handlePickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setErrorModalMessage('É necessário conceder permissão para acessar a galeria de fotos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      setError('O nome não pode estar vazio.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let photoToSend: string | null = null;
      if (photoUri) {
        if (photoUri.startsWith('http://') || photoUri.startsWith('https://')) {
          photoToSend = photoUri;
        } else {
          // Faz o upload da foto local para o Supabase Storage
          photoToSend = await uploadImageToServer(photoUri, 'profiles');
        }
      }

      // 1. Save profile to backend (updates SQLite cache if online)
      const updatedUser = await updateProfile({ 
        name: name.trim(), 
        email: email.trim(), 
        photo: photoToSend 
      });
      
      // 2. Persist profile photo locally
      if (updatedUser) {
        if (photoToSend) {
          await setLocalConfigValue(`profile_photo_${updatedUser.id}`, photoToSend);
        } else {
          await setLocalConfigValue(`profile_photo_${updatedUser.id}`, '');
        }
      }
      
      setSuccessModalVisible(true);
    } catch (err: any) {
      setErrorModalMessage(err.message || 'Falha ao salvar perfil.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <AppHeader title="Editar Perfil" showBack onPressBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title="Editar Perfil" showBack onPressBack={() => navigation.goBack()} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.avatarContainer}>
            <Pressable onPress={handlePickImage} style={styles.avatarPressable}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person-outline" size={60} color={colors.textMuted} />
                </View>
              )}
              <View style={styles.cameraIconContainer}>
                <Ionicons name="camera" size={20} color={colors.buttonText} />
              </View>
            </Pressable>
            <Text style={styles.avatarHint}>Toque para alterar a foto</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Nome</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Digite seu nome..."
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.label}>E-mail (Não alterável)</Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={email}
              editable={false}
              selectTextOnFocus={false}
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable style={styles.saveButton} onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color={colors.buttonText} />
              ) : (
                <Text style={styles.saveButtonText}>Salvar Alterações</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmModal
        visible={successModalVisible}
        title="Perfil Atualizado"
        message="Suas alterações e foto de perfil foram salvas com sucesso!"
        confirmLabel="OK"
        hideCancel
        onConfirm={() => {
          setSuccessModalVisible(false);
          navigation.goBack();
        }}
      />

      <ConfirmModal
        visible={!!errorModalMessage}
        title="Aviso"
        message={errorModalMessage || ''}
        confirmLabel="OK"
        hideCancel
        onConfirm={() => setErrorModalMessage(null)}
      />
    </SafeAreaView>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    content: {
      padding: 24,
      alignItems: 'center',
    },
    avatarContainer: {
      alignItems: 'center',
      marginVertical: 20,
    },
    avatarPressable: {
      position: 'relative',
    },
    avatar: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors.surface,
    },
    avatarPlaceholder: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    cameraIconContainer: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      backgroundColor: colors.accent,
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.card,
    },
    avatarHint: {
      marginTop: 8,
      fontSize: 14,
      color: colors.textMuted,
    },
    form: {
      width: '100%',
      marginTop: 20,
      gap: 12,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      backgroundColor: colors.card,
      color: colors.textPrimary,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 15,
      marginBottom: 8,
    },
    disabledInput: {
      opacity: 0.6,
      backgroundColor: colors.surface,
    },
    errorText: {
      color: colors.error,
      fontSize: 14,
      marginTop: 4,
      textAlign: 'center',
    },
    saveButton: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 14,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 16,
    },
    saveButtonText: {
      color: colors.buttonText,
      fontSize: 16,
      fontWeight: 'bold',
    },
  });
}
