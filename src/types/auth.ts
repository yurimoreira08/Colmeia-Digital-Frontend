import type { ManejoReport } from "./manejo";
import type { ReviewReport } from "./reviewReport"; 

export type User = {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  photo?: string | null;
  termsAcceptedAt?: string;
  termsAcceptedVersion?: string;
  createdAt: string;
  updatedAt: string;
};

export type Session = {
  id: number;
  userId: number;
  createdAt: string;
};

export type RootStackParamList = {
  Splash: undefined;
  TermsOfUse: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: { initialEmail?: string } | undefined;
  ResetPassword: { email: string };
  Home: undefined;
  Reports: undefined;
  CreateEditApiary: { apiaryId?: number } | undefined;
  RevisionManejoChoice: undefined;
  RevisionList: undefined;
  ManejoList: undefined;
  ApiaryList:
    | {
        editApiaryId?: number;
      }
    | undefined;
  BoxesList:
    | {
        apiaryId?: number;
        apiaryName?: string;
        mode?: "revision" | "manejo";
        isSoltas?: boolean;
        role?: 'owner' | 'editor' | 'reader';
      }
    | undefined;
  BoxRevision: {
    boxId: number;
    boxName: string;
    apiaryName: string;
    apiaryId: number | null;
    tipo: "apiario";
    photoUri?: string | null;
  };
  BoxManejo: {
    boxId: number;
    boxName: string;
    apiaryName: string;
    apiaryId: number | null;
    tipo: "apiario";
    revisaoId?: number;
  };
  ReviewReportsList:
    | {
        tipo?: "apiario";
        apiaryId?: number;
        apiaryName?: string;
        role?: 'owner' | 'editor' | 'reader';
      }
    | undefined;
  Settings: undefined;
  VoiceTutorial: undefined;
  EditProfile: undefined;
  Notifications: undefined;
  AboutApp: undefined;
  EditManejoNotes: { manejo: ManejoReport };
  EditReportNotes: { report: ReviewReport };
};
