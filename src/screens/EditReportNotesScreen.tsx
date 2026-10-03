import React, { useState, useCallback } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppHeader } from "../components/AppHeader";
import { useAppTheme } from "../theme/ThemeContext";
import { updateRevision } from "../services/reviewReportService";
import type { RootStackParamList } from "../types/auth";

type Props = NativeStackScreenProps<RootStackParamList, "EditReportNotes">;

const CHECK_OPTIONS = [
  { id: "nucleo", label: "Núcleo" },
  { id: "caixa", label: "Caixa" },
  { id: "rainha", label: "Rainha" },
  { id: "polen", label: "Pólen" },
  { id: "mel", label: "Mel" },
  { id: "cria-nova-3-dias", label: "Cria Nova\n3 dias" },
  { id: "cria-aberta", label: "Cria Aberta" },
  { id: "cria-fechada", label: "Cria Fechada" },
  { id: "ovos", label: "Ovos" },
  { id: "com-espaco", label: "Com espaço" },
  { id: "sem-espaco", label: "Sem espaço" },
  { id: "forca-fraca", label: "Força - Fraca" },
  { id: "forca-media", label: "Força - Média" },
  { id: "forca-boa", label: "Força - Boa" },
];

export function EditReportNotesScreen({ navigation, route }: Props) {
  const { report } = route.params;
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  const [obs, setObs] = useState(report.observacoes || "");
  const [ind, setInd] = useState(report.indicacoes || "");
  
  const [checkedOptions, setCheckedOptions] = useState<Record<string, boolean>>(() => {
    const obj: Record<string, boolean> = {};
    if (report.checkedOptions) {
      report.checkedOptions.forEach((opt) => {
        obj[opt] = true;
      });
    }
    return obj;
  });

  const toggleOption = useCallback((id: string) => {
    setCheckedOptions((prev) => {
      const nextObj = { ...prev, [id]: !prev[id] };
      
      if (nextObj[id]) {
        if (id === "caixa") nextObj["nucleo"] = false;
        if (id === "nucleo") nextObj["caixa"] = false;
        if (id === "com-espaco") nextObj["sem-espaco"] = false;
        if (id === "sem-espaco") nextObj["com-espaco"] = false;
        if (id === "forca-fraca") {
          nextObj["forca-media"] = false;
          nextObj["forca-boa"] = false;
        }
        if (id === "forca-media") {
          nextObj["forca-fraca"] = false;
          nextObj["forca-boa"] = false;
        }
        if (id === "forca-boa") {
          nextObj["forca-fraca"] = false;
          nextObj["forca-media"] = false;
        }
      }
      return nextObj;
    });
  }, []);

  async function handleSave() {
    try {
      const finalChecked = Object.entries(checkedOptions)
        .filter(([, isChecked]) => isChecked)
        .map(([key]) => key);

      await updateRevision(report.id, {
        observacoes: obs,
        indicacoes: ind,
        checkedOptions: finalChecked,
      });

      Alert.alert("Sucesso", "Revisão atualizada com sucesso!");
      navigation.goBack();
    } catch (error) {
      Alert.alert("Erro", "Não foi possível salvar as alterações.");
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Editar Revisão"
        showBack
        onPressBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.boxSubtitle}>{report.caixaName}</Text>
          <Text style={styles.sectionTitle}>Opções Marcadas</Text>

          <View style={styles.grid}>
            {CHECK_OPTIONS.map((option) => {
              const active = !!checkedOptions[option.id];
              return (
                <Pressable
                  key={option.id}
                  style={[
                    styles.optionCard,
                    active && styles.optionCardActive,
                  ]}
                  onPress={() => toggleOption(option.id)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      active && styles.optionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>Anotações</Text>

          <Text style={styles.inputLabel}>Observações</Text>
          <TextInput
            style={styles.textArea}
            multiline
            value={obs}
            onChangeText={setObs}
            placeholder="Digite as observações..."
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.inputLabel}>O que fazer (Indicações)</Text>
          <TextInput
            style={styles.textArea}
            multiline
            value={ind}
            onChangeText={setInd}
            placeholder="Digite a ação recomendada..."
            placeholderTextColor={colors.textMuted}
          />

          <Pressable style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Salvar Alterações</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
    safeArea: { 
      flex: 1, 
      backgroundColor: colors.background 
    },
    content: { 
      padding: 18, 
      paddingBottom: 40 
    },
    boxSubtitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.textPrimary,
      textAlign: "center",
      marginBottom: 15,
      marginTop: -5,
    },
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
    inputLabel: {
      fontSize: 15,
      color: colors.textPrimary,
      marginTop: 15,
      marginBottom: 6,
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
    saveBtn: {
      backgroundColor: colors.accent,
      padding: 18,
      borderRadius: 15,
      alignItems: "center",
      marginTop: 30,
    },
    saveBtnText: { 
      color: colors.buttonText, 
      fontWeight: "bold", 
      fontSize: 16 
    },
  });
}