import type { RootStackParamList } from '../types/auth';

export type VoiceRouteMatch = {
  route: keyof RootStackParamList;
  label: string;
};

type VoiceRouteAlias = {
  route: keyof RootStackParamList;
  label: string;
  aliases: string[];
};

const VOICE_ROUTE_ALIASES: VoiceRouteAlias[] = [
  {
    route: 'Home',
    label: 'Início',
    aliases: ['inicio', 'home', 'tela inicial', 'menu principal', 'pagina inicial', 'ir para o inicio'],
  },
  {
    route: 'ApiaryList',
    label: 'Apiários',
    aliases: ['apiarios', 'meus apiarios', 'lista de apiarios', 'ver apiarios', 'abrir apiarios'],
  },
  {
    route: 'CreateEditApiary',
    label: 'Novo Apiário',
    aliases: ['novo apiario', 'cadastrar apiario', 'criar apiario', 'adicionar apiario'],
  },
  {
    route: 'RevisionManejoChoice',
    label: 'Operações de Campo',
    aliases: ['operacoes', 'operacoes de campo', 'escolha', 'revisao e manejo', 'menu de operacoes'],
  },
  {
    route: 'RevisionList',
    label: 'Revisões',
    aliases: ['revisoes', 'lista de revisoes', 'fazer revisao', 'inspecoes', 'lista de inspecoes'],
  },
  {
    route: 'ManejoList',
    label: 'Manejos',
    aliases: ['manejos', 'lista de manejos', 'fazer manejo', 'intervencoes'],
  },
  {
    route: 'Reports',
    label: 'Relatórios',
    aliases: ['relatorios', 'ver relatorios', 'historico', 'historico geral', 'relatorio'],
  },
  {
    route: 'Notifications',
    label: 'Notificações',
    aliases: ['notificacoes', 'avisos', 'alertas', 'mensagens'],
  },
  {
    route: 'Settings',
    label: 'Configurações',
    aliases: ['configuracoes', 'ajustes', 'preferencias', 'opcoes'],
  },
  {
    route: 'VoiceTutorial',
    label: 'Tutorial de Voz',
    aliases: ['tutorial de voz', 'como usar comando de voz', 'comandos de voz', 'ajuda de voz', 'guia de voz', 'manual de voz'],
  },
  {
    route: 'EditProfile',
    label: 'Perfil',
    aliases: ['perfil', 'meu perfil', 'editar perfil', 'minha conta'],
  },
  {
    route: 'AboutApp',
    label: 'Sobre o Aplicativo',
    aliases: ['sobre', 'sobre o app', 'sobre o aplicativo', 'informacoes'],
  },
];

function normalizeVoiceText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[!?.,;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function removeNavigationPrefixes(value: string): string {
  return value
    .replace(/^(por favor\s+)?(pode\s+)?(voce\s+)?/g, '')
    .replace(/^(ir\s+para|abrir|acessar|navegar\s+para|entrar\s+em)\s+/g, '')
    .trim();
}

export function parseVoiceNavigationCommand(rawCommand: string): VoiceRouteMatch | null {
  const normalized = normalizeVoiceText(rawCommand);

  if (!normalized) {
    return null;
  }

  const cleanedCommand = removeNavigationPrefixes(normalized);

  for (const item of VOICE_ROUTE_ALIASES) {
    for (const alias of item.aliases) {
      if (cleanedCommand === alias || cleanedCommand.includes(alias)) {
        return { route: item.route, label: item.label };
      }
    }
  }

  return null;
}
