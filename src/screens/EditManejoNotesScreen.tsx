import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  Image,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { saveImagePermanently } from "../utils/filePersistence";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppHeader } from "../components/AppHeader";
import { PhotoOptionsModal } from "../components/PhotoOptionsModal";
import { useAppTheme } from "../theme/ThemeContext";
import { updateManejoService } from "../services/manejoService";
import { markBoxModifiedInSession } from "../services/sessionStore";
import { MANEJO_OPTION_LABELS, ManejoTask } from "../types/manejo";
import type { RootStackParamList } from "../types/auth";

type Props = NativeStackScreenProps<RootStackParamList, "EditManejoNotes">;

export function EditManejoNotesScreen({ navigation, route }: Props) {
  const { manejo } = route.params;
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  const [obs, setObs] = useState(manejo.observacoes || "");
  const [ind, setInd] = useState(manejo.indicacoes || "");
  const [photoUri, setPhotoUri] = useState<string | undefined>(manejo.photoUri);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);

  const [tasks, setTasks] = useState<Record<string, any>>(() => {
    const obj: Record<string, any> = {};

    Object.keys(MANEJO_OPTION_LABELS).forEach((id) => {
      obj[id] = { id, obs: "", ind: "", active: false, customName: "" };
    });

    manejo.checkedOptions.forEach((task) => {
      obj[task.id] = { ...task, active: true };
    });

    return obj;
  });

  const toggleTask = (id: string) => {
    setTasks((prev) => ({
      ...prev,
      [id]: { ...prev[id], active: !prev[id].active },
    }));
  };

  const updateTaskDetail = (
    id: string,
    field: "obs" | "ind" | "customName",
    value: string,
  ) => {
    setTasks((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  async function openCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permissão negada", "Acesso à câmera é necessário.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      try {
        const savedUri = await saveImagePermanently(result.assets[0].uri);
        setPhotoUri(savedUri);
      } catch (err) {
        Alert.alert("Erro", "Erro ao salvar imagem.");
      }
    }
  }

  async function openGallery() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permissão negada", "Acesso à galeria é necessário.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      try {
        const savedUri = await saveImagePermanently(result.assets[0].uri);
        setPhotoUri(savedUri);
      } catch (err) {
        Alert.alert("Erro", "Erro ao salvar imagem.");
      }
    }
  }

  function handleTakePhoto() {
    setPhotoModalVisible(true);
  }

  async function handleSave() {
    try {
      const finalTasks: ManejoTask[] = Object.values(tasks)
        .filter((t) => t.active)
        .map(({ id, obs, ind, customName }) => ({
          id,
          obs,
          ind,
          ...(id === "outro" ? { customName } : {}),
        }));

      await updateManejoService(manejo.id, {
        checkedOptions: finalTasks,
        observacoes: obs,
        indicacoes: ind,
        photoUri: photoUri,
      });

      if (manejo.caixaId) {
        markBoxModifiedInSession(manejo.caixaId, 'manejo');
      }

      Alert.alert("Sucesso", "Manejo atualizado com sucesso!");
      navigation.goBack();
    } catch (error) {
      Alert.alert("Erro", "Não foi possível salvar as alterações.");
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Editar Manejo"
        showBack
        onPressBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionTitle}>Tarefas Realizadas</Text>

          <View style={styles.grid}>
            {Object.entries(MANEJO_OPTION_LABELS).map(([id, label]) => {
              const active = tasks[id].active;
              return (
                <Pressable
                  key={id}
                  style={[
                    styles.optionCard,
                    active && styles.optionCardActive,
                  ]}
                  onPress={() => toggleTask(id)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      active && styles.optionTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {Object.values(tasks).some((t) => t.active) && (
            <Text style={styles.sectionTitle}>Detalhes das Tarefas</Text>
          )}

          {Object.entries(MANEJO_OPTION_LABELS).map(([id, label]) => {
            const taskData = tasks[id];
            if (!taskData.active) return null;

            return (
              <View key={id} style={styles.taskDetailCard}>
                <Text style={styles.taskDetailTitle}>{label}</Text>

                {id === "outro" && (
                  <>
                    <Text style={styles.inputLabel}>Qual o outro manejo?</Text>
                    <TextInput
                      style={styles.innerInput}
                      value={taskData.customName || ""}
                      onChangeText={(v) => updateTaskDetail(id, "customName", v)}
                      placeholder="Qual o outro manejo..."
                      placeholderTextColor={colors.textMuted}
                    />
                  </>
                )}

                <Text style={styles.inputLabel}>Observações da Tarefa</Text>
                <TextInput
                  style={styles.innerInput}
                  value={taskData.obs}
                  onChangeText={(v) => updateTaskDetail(id, "obs", v)}
                  placeholder="Obs..."
                  placeholderTextColor={colors.textMuted}
                />

                <Text style={styles.inputLabel}>Próxima Ação</Text>
                <TextInput
                  style={styles.innerInput}
                  value={taskData.ind}
                  onChangeText={(v) => updateTaskDetail(id, "ind", v)}
                  placeholder="O que fazer..."
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            );
          })}

          <Text style={styles.sectionTitle}>Geral e Foto</Text>

          <Pressable style={styles.photoButton} onPress={handleTakePhoto}>
            <Ionicons name="camera" size={20} color={colors.textPrimary} />
            <Text style={{ color: colors.textPrimary }}>
              {photoUri ? "Alterar Foto" : "Tirar Foto"}
            </Text>
          </Pressable>

          {photoUri && (
            <View style={styles.photoContainer}>
              <Image source={{ uri: photoUri }} style={styles.photoPreview} />
              <Pressable
                style={styles.removePhoto}
                onPress={() => setPhotoUri(undefined)}
              >
                <Ionicons name="close-circle" size={26} color={colors.error} />
              </Pressable>
            </View>
          )}

          <Text style={styles.inputLabel}>Observações Gerais</Text>
          <TextInput
            style={styles.textArea}
            multiline
            value={obs}
            onChangeText={setObs}
            placeholder="Digite as observações gerais..."
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.inputLabel}>O que fazer (Indicações Gerais)</Text>
          <TextInput
            style={styles.textArea}
            multiline
            value={ind}
            onChangeText={setInd}
            placeholder="Digite a ação recomendada geral..."
            placeholderTextColor={colors.textMuted}
          />

          <Pressable style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Salvar Alterações</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <PhotoOptionsModal
        visible={photoModalVisible}
        onClose={() => setPhotoModalVisible(false)}
        onSelectCamera={openCamera}
        onSelectGallery={openGallery}
        hasPhoto={!!photoUri}
        onRemovePhoto={() => setPhotoUri(undefined)}
      />
    </SafeAreaView>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    content: { padding: 18, gap: 12, paddingBottom: 40 },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.textPrimary,
      marginTop: 10,
      marginBottom: 10,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      gap: 10,
      marginBottom: 10,
    },
    optionCard: {
      width: "48%",
      minHeight: 60,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.card,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 8,
      paddingVertical: 8,
    },
    optionCardActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    optionText: {
      fontSize: 14,
      textAlign: "center",
      color: colors.textPrimary,
      fontWeight: "600",
    },
    optionTextActive: {
      color: colors.buttonText || "#000",
      fontWeight: "bold",
    },
    taskDetailCard: {
      borderRadius: 12,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 15,
      gap: 8,
      marginTop: 10,
    },
    taskDetailTitle: {
      fontSize: 16,
      fontWeight: "bold",
      color: colors.textPrimary,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
      paddingBottom: 6,
      marginBottom: 4,
    },
    innerInput: {
      backgroundColor: colors.inputBackground || "rgba(0,0,0,0.05)",
      borderRadius: 8,
      padding: 10,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.inputBorder || colors.cardBorder,
    },
    inputLabel: {
      fontSize: 15,
      color: colors.textPrimary,
      marginTop: 12,
      marginBottom: 4,
      fontWeight: "600",
    },
    textArea: {
      minHeight: 120,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.card,
      paddingHorizontal: 16,
      paddingVertical: 16,
      fontSize: 16,
      color: colors.textPrimary,
      textAlignVertical: "top",
    },
    photoButton: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 10,
      padding: 15,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.card,
    },
    photoContainer: { marginTop: 10, position: "relative" },
    photoPreview: { width: "100%", height: 200, borderRadius: 12 },
    removePhoto: { position: "absolute", top: 10, right: 10 },
    saveBtn: {
      backgroundColor: colors.accent,
      padding: 18,
      borderRadius: 15,
      alignItems: "center",
      marginTop: 20,
    },
    saveBtnText: { color: colors.buttonText, fontWeight: "bold", fontSize: 16 },
  });
}
