import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  Animated,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ConfirmModal } from '../components/ConfirmModal';
import { AppHeader } from '../components/AppHeader';
import { BottomDock } from '../components/BottomDock';
import { FloatingScrollButtons } from '../components/FloatingScrollButtons';
import { PhotoOptionsModal } from '../components/PhotoOptionsModal';
import { useAppTheme } from '../theme/ThemeContext';
import { useBoxManejo, MANEJO_OPTIONS } from '../hooks/useBoxManejo';
import { useKeyboardVisible } from '../hooks/useKeyboardVisible';
import { createStyles } from './styles/BoxManejoScreen.styles';
import type { RootStackParamList } from '../types/auth';

type Props = NativeStackScreenProps<RootStackParamList, 'BoxManejo'>;

export function BoxManejoScreen({ navigation, route }: Props) {
  const hook = useBoxManejo(navigation, route.params);
  const { themeName } = useAppTheme();
  const styles = createStyles(hook.colors);
  const placeholderColor = themeName === 'obsidian-dark' ? '#64748B' : '#94A3B8';
  const { isKeyboardVisible, keyboardHeight } = useKeyboardVisible();

  const {
    colors,
    isListening,
    currentTranscript,
    toggleListening,
    selectedTasks,
    setSelectedTasks,
    collapsedTasks,
    setCollapsedTasks,
    tempTaskObservations,
    setTempTaskObservations,
    tempTaskIndications,
    setTempTaskIndications,
    tempTaskName,
    setTempTaskName,
    activeVoiceField,
    setActiveVoiceField,
    lastActiveId,
    setLastActiveId,
    successModal,
    setSuccessModal,
    errorModal,
    setErrorModal,
    photoUri,
    setPhotoUri,
    handleTakePhoto,
    photoModalVisible,
    setPhotoModalVisible,
    openCamera,
    openGallery,
    scrollY,
    setScrollY,
    scrollViewRef,
    onLayoutSection,
    onLayoutGrid,
    onLayoutTask,
    scrollToTask,
    toggleOption,
    handleFinishManejo,
  } = hook;

  return (
    <View style={styles.safeArea}>
      <AppHeader
        title="Manejo"
        showBack
        showMic
        onPressBack={() => navigation.goBack()}
        onPressBell={() => navigation.navigate('Notifications')}
      />

      {isListening && (currentTranscript || activeVoiceField) ? (
        <Animated.View style={styles.floatingTranscript}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              marginBottom: currentTranscript ? 4 : 0,
            }}
          >
            <Ionicons name="mic" size={16} color={colors.textPrimary} />
            <Text style={[styles.floatingTranscriptText, { opacity: 0.8 }]}>
              {activeVoiceField === 'obs'
                ? 'Ouvindo Observação...'
                : activeVoiceField === 'act'
                  ? 'Ouvindo O Que Fazer...'
                  : activeVoiceField === 'name'
                    ? 'Ouvindo Qual o Outro Manejo...'
                    : 'Ouvindo comandos...'}
            </Text>
          </View>
          {currentTranscript ? (
            <Text style={styles.floatingTranscriptText} numberOfLines={2}>
              "{currentTranscript}"
            </Text>
          ) : null}
        </Animated.View>
      ) : null}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)}
          scrollEventThrottle={16}
          style={{ flex: 1 }}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Hero da Caixa e Apiário */}
          <View style={styles.heroCard}>
            <View style={styles.heroIconBadge}>
              <Ionicons name="construct" size={24} color="#D97706" />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.heroBoxTitle}>{route.params.boxName}</Text>
              <View style={styles.heroApiaryRow}>
                <Ionicons name="business-outline" size={13} color={colors.textMuted} />
                <Text style={styles.heroApiaryText}>{route.params.apiaryName}</Text>
              </View>
              {route.params.revisaoId ? (
                <Text style={styles.heroApiaryText}>Vínculo: Revisão #{route.params.revisaoId}</Text>
              ) : null}
            </View>
            <View style={styles.activeManejoBadge}>
              <View style={styles.pulsingDot} />
              <Text style={styles.activeManejoBadgeText}>Em Manejo</Text>
            </View>
          </View>

          {/* Botão de Comando de Voz */}
          <Pressable
            style={({ pressed }) => [
              styles.voiceCard,
              isListening ? styles.voiceCardActive : null,
              pressed ? { transform: [{ scale: 0.99 }] } : null,
            ]}
            onPress={() => {
              void toggleListening();
            }}
          >
            <View style={[styles.voiceIconWrap, isListening ? styles.voiceIconWrapActive : null]}>
              <Ionicons name={isListening ? "mic" : "mic-outline"} size={24} color={isListening ? "#FFFFFF" : "#D97706"} />
            </View>
            <View style={styles.voiceTextWrap}>
              <Text style={styles.voiceTitle}>{isListening ? 'Ouvindo seus comandos...' : 'Comando por Voz'}</Text>
              <Text style={styles.voiceSubtitle}>
                {isListening ? 'Fale os manejos para marcar ou dite anotações' : 'Toque para preencher falando em campo'}
              </Text>
            </View>
            {isListening ? (
              <View style={styles.recordingPill}>
                <Text style={styles.recordingPillText}>ATIVO</Text>
              </View>
            ) : null}
          </Pressable>

          {/* Seção de Atividades de Manejo */}
          <View style={styles.sectionBlock} onLayout={onLayoutSection}>
            <Text style={styles.sectionHeader}>ATIVIDADES DE MANEJO</Text>
            <View style={styles.grid} onLayout={onLayoutGrid}>
              {MANEJO_OPTIONS.map((option) => {
                const active = !!selectedTasks[option.id];
                const task = selectedTasks[option.id];

                return (
                  <View
                    key={option.id}
                    style={active ? styles.activeTaskContainer : styles.taskContainer}
                    onLayout={(e) => onLayoutTask(option.id, e)}
                  >
                    <Pressable
                      style={[styles.optionCard, active ? styles.optionCardActive : null]}
                      onPress={() => toggleOption(option.id)}
                    >
                      <Text style={[styles.optionText, active ? styles.optionTextActive : null]}>
                        {option.label}
                      </Text>
                    </Pressable>

                    {active && !collapsedTasks[option.id] && (
                      <View style={styles.taskNotes}>
                        {option.id === 'outro' && (
                          <View style={{ gap: 6 }}>
                            <View style={styles.fieldHeader}>
                              <Text style={styles.fieldLabel}>Qual o outro manejo?</Text>
                              {activeVoiceField === 'name' && isListening && lastActiveId === task.id ? (
                                <View style={styles.voiceFieldBadge}>
                                  <Ionicons name="mic" size={12} color="#D97706" />
                                  <Text style={styles.voiceFieldBadgeText}>Ouvindo...</Text>
                                </View>
                              ) : null}
                            </View>
                            <TextInput
                              style={styles.taskInput}
                              placeholder="Ex: Limpeza de fundo, troca de tela..."
                              placeholderTextColor={placeholderColor}
                              value={task.customName || ''}
                              onChangeText={(val) => {
                                setSelectedTasks((prev) => {
                                  const cur = prev[task.id];
                                  if (!cur) return prev;
                                  return { ...prev, [task.id]: { ...cur, customName: val } };
                                });
                                setTempTaskName((prev) => ({
                                  ...prev,
                                  [task.id]: '',
                                }));
                              }}
                              onFocus={() => {
                                setLastActiveId(task.id);
                                setActiveVoiceField('name');
                                scrollToTask(task.id);
                              }}
                            />
                            {tempTaskName[task.id] ? (
                              <Text style={styles.voicePreview}>🎤 {tempTaskName[task.id]}</Text>
                            ) : null}
                          </View>
                        )}

                        <View style={{ gap: 6 }}>
                          <View style={styles.fieldHeader}>
                            <Text style={styles.fieldLabel}>Observações</Text>
                            {activeVoiceField === 'obs' && isListening && lastActiveId === task.id ? (
                              <View style={styles.voiceFieldBadge}>
                                <Ionicons name="mic" size={12} color="#D97706" />
                                <Text style={styles.voiceFieldBadgeText}>Ouvindo...</Text>
                              </View>
                            ) : null}
                          </View>
                          <TextInput
                            style={styles.taskInput}
                            placeholder="Ex: Foram colocados 500ml de xarope..."
                            placeholderTextColor={placeholderColor}
                            value={task.obs || ''}
                            onChangeText={(val) => {
                              setSelectedTasks((prev) => {
                                const cur = prev[task.id];
                                if (!cur) return prev;
                                return { ...prev, [task.id]: { ...cur, obs: val } };
                              });
                              setTempTaskObservations((prev) => ({
                                ...prev,
                                [task.id]: '',
                              }));
                            }}
                            onFocus={() => {
                              setLastActiveId(task.id);
                              setActiveVoiceField('obs');
                              scrollToTask(task.id);
                            }}
                            multiline
                          />
                          {tempTaskObservations[task.id] ? (
                            <Text style={styles.voicePreview}>🎤 {tempTaskObservations[task.id]}</Text>
                          ) : null}
                        </View>

                        <View style={{ gap: 6 }}>
                          <View style={styles.fieldHeader}>
                            <Text style={styles.fieldLabel}>O que fazer</Text>
                            {activeVoiceField === 'act' && isListening && lastActiveId === task.id ? (
                              <View style={styles.voiceFieldBadge}>
                                <Ionicons name="mic" size={12} color="#D97706" />
                                <Text style={styles.voiceFieldBadgeText}>Ouvindo...</Text>
                              </View>
                            ) : null}
                          </View>
                          <TextInput
                            style={styles.taskInput}
                            placeholder="Ex: Repor alimentação daqui a 7 dias..."
                            placeholderTextColor={placeholderColor}
                            value={task.ind || ''}
                            onChangeText={(val) => {
                              setSelectedTasks((prev) => {
                                const cur = prev[task.id];
                                if (!cur) return prev;
                                return { ...prev, [task.id]: { ...cur, ind: val } };
                              });
                              setTempTaskIndications((prev) => ({
                                ...prev,
                                [task.id]: '',
                              }));
                            }}
                            onFocus={() => {
                              setLastActiveId(task.id);
                              setActiveVoiceField('act');
                              scrollToTask(task.id);
                            }}
                            multiline
                          />
                          {tempTaskIndications[task.id] ? (
                            <Text style={styles.voicePreview}>🎤 {tempTaskIndications[task.id]}</Text>
                          ) : null}
                        </View>

                        <Pressable
                          style={styles.concluirTaskBtn}
                          onPress={() => {
                            Keyboard.dismiss();
                            setCollapsedTasks((prev) => ({
                              ...prev,
                              [task.id]: true,
                            }));
                            if (lastActiveId === task.id) {
                              setLastActiveId(null);
                              setActiveVoiceField(null);
                            }
                          }}
                        >
                          <Text style={styles.concluirTaskBtnText}>Fechar Anotações</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          {/* Seção de Foto */}
          <View style={styles.photoSection}>
            <View style={styles.fieldHeader}>
              <Text style={styles.fieldLabel}>Foto do Manejo (opcional)</Text>
            </View>
            <Pressable style={styles.photoButton} onPress={handleTakePhoto}>
              <Ionicons name="camera-outline" size={24} color="#D97706" />
              <Text style={styles.photoButtonText}>{photoUri ? 'Trocar Foto' : 'Tirar Foto do Manejo'}</Text>
            </Pressable>
            {photoUri ? (
              <View style={styles.photoPreviewContainer}>
                <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
                <Pressable style={styles.removePhotoBtn} onPress={() => setPhotoUri(null)}>
                  <Ionicons name="close-circle" size={24} color={colors.error} />
                </Pressable>
              </View>
            ) : null}
          </View>

          {/* Botão de Finalização */}
          <View style={styles.actionsArea}>
            <Pressable 
              style={({ pressed }) => [
                styles.primaryAction,
                pressed ? { transform: [{ scale: 0.985 }] } : null,
              ]} 
              onPress={handleFinishManejo}
            >
              <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
              <Text style={styles.primaryActionText}>Salvar Manejo</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <FloatingScrollButtons
        scrollRef={scrollViewRef}
        currentY={scrollY}
        bottomOffset={isKeyboardVisible ? keyboardHeight + 16 : 110}
      />

      {!isKeyboardVisible && (
        <BottomDock
          active={null}
          onPressHome={() => navigation.replace('Home')}
          onPressSettings={() => navigation.replace('Settings')}
        />
      )}

      <ConfirmModal
        visible={successModal}
        title="Manejo Salvo"
        message={`Manejo da caixa ${route.params.boxName} registrado com sucesso.`}
        confirmLabel="OK"
        hideCancel
        onConfirm={() => {
          setSuccessModal(false);
          navigation.goBack();
        }}
      />

      <ConfirmModal
        visible={!!errorModal}
        title="Erro"
        message={errorModal || ''}
        confirmLabel="OK"
        hideCancel
        onConfirm={() => setErrorModal(null)}
      />

      <PhotoOptionsModal
        visible={photoModalVisible}
        onClose={() => setPhotoModalVisible(false)}
        onSelectCamera={openCamera}
        onSelectGallery={openGallery}
        hasPhoto={!!photoUri}
        onRemovePhoto={() => setPhotoUri(null)}
      />
    </View>
  );
}
