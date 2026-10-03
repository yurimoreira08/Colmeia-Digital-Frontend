import { useEffect } from "react";
import {
  NavigationContainer,
  useNavigationContainerRef,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { HomeScreen } from "../screens/HomeScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { AboutAppScreen } from "../screens/AboutAppScreen";
import { ApiaryListScreen } from "../screens/ApiaryListScreen";
import { BoxRevisionScreen } from "../screens/BoxReviewScreen";
import { BoxManejoScreen } from "../screens/BoxManejoScreen";
import { BoxesListScreen } from "../screens/BoxesListScreen";
import { CreateEditApiaryScreen } from "../screens/CreateEditApiaryScreen";
import { NotificationsScreen } from "../screens/NotificationsScreen";
import { ReportsScreen } from "../screens/ReportsScreen";
import { ReviewReportsListScreen } from "../screens/ReviewReportsListScreen";
import { RegisterScreen } from "../screens/RegisterScreen";
import { ForgotPasswordScreen } from "../screens/ForgotPasswordScreen";
import { ResetPasswordScreen } from "../screens/ResetPasswordScreen";
import { RevisionManejoChoiceScreen } from "../screens/RevisionManejoChoiceScreen";
import { RevisionListScreen } from "../screens/RevisionListScreen";
import { ManejoListScreen } from "../screens/ManejoListScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { EditProfileScreen } from "../screens/EditProfileScreen";
import { AppSplashScreen } from "../screens/SplashScreen";
import { EditManejoNotesScreen } from "../screens/EditManejoNotesScreen";
import { EditReportNotesScreen } from "../screens/EditReportNotesScreen";
import { TermsOfUseScreen } from "../screens/TermsOfUseScreen";
import { VoiceTutorialScreen } from "../screens/VoiceTutorialScreen";
import type { RootStackParamList } from "../types/auth";
import { VoiceCommandProvider } from "../voice/VoiceCommandContext";

import { useAutoSync } from "../hooks/useAutoSync";
import { useDeepLinking } from "../hooks/useDeepLinking";
import { requestNotificationPermissions } from "../services/notificationsService";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  
  // Solicita permissão para notificações nativas ao iniciar o app
  useEffect(() => {
    void requestNotificationPermissions();
  }, []);

  // Inicializa o gerenciador de sincronização automática offline-first
  useAutoSync();

  // Escuta deep links
  useDeepLinking(navigationRef);

  return (
    <VoiceCommandProvider navigationRef={navigationRef}>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator
          initialRouteName="Splash"
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Splash" component={AppSplashScreen} />
          <Stack.Screen name="TermsOfUse" component={TermsOfUseScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Reports" component={ReportsScreen} />
          <Stack.Screen name="CreateEditApiary" component={CreateEditApiaryScreen} />
          <Stack.Screen
            name="RevisionManejoChoice"
            component={RevisionManejoChoiceScreen}
          />
          <Stack.Screen name="RevisionList" component={RevisionListScreen} />
          <Stack.Screen name="ManejoList" component={ManejoListScreen} />
          <Stack.Screen name="ApiaryList" component={ApiaryListScreen} />
          <Stack.Screen name="BoxesList" component={BoxesListScreen} />
          <Stack.Screen name="BoxRevision" component={BoxRevisionScreen} />
          <Stack.Screen name="BoxManejo" component={BoxManejoScreen} />
          <Stack.Screen
            name="ReviewReportsList"
            component={ReviewReportsListScreen}
          />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="VoiceTutorial" component={VoiceTutorialScreen} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="AboutApp" component={AboutAppScreen} />
          <Stack.Screen
            name="EditManejoNotes"
            component={EditManejoNotesScreen}
          />
          <Stack.Screen
            name="EditReportNotes"
            component={EditReportNotesScreen}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </VoiceCommandProvider>
  );
}
