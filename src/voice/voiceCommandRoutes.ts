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
    aliases: ['inicio', 'home', 'ir para inicio', 'ir para o inicio', 'ir para a home', 'tela inicial', 'menu principal', 'pagina inicial'],
  },
  {
    route: 'ApiaryList',
    label: 'Apiários',
    aliases: ['apiarios', 'ir para apiarios', 'ir para os apiarios', 'abrir apiarios', 'meus apiarios', 'lista de apiarios', 'ver apiarios'],
  },
  {
    route: 'BoxesList',
    label: 'Caixas',
    aliases: ['caixas', 'ir para caixas', 'ir para as caixas', 'abrir caixas', 'minhas caixas', 'lista de caixas', 'ver caixas', 'colmeias', 'ir para colmeias'],
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
    aliases: ['revisoes', 'ir para revisoes', 'ir para as revisoes', 'abrir revisoes', 'lista de revisoes', 'fazer revisao', 'inspecoes', 'lista de inspecoes'],
  },
  {
    route: 'ManejoList',
    label: 'Manejos',
    aliases: ['manejos', 'ir para manejos', 'ir para os manejos', 'abrir manejos', 'lista de manejos', 'fazer manejo', 'intervencoes'],
  },
  {
    route: 'Reports',
    label: 'Relatórios',
    aliases: ['relatorios', 'ir para relatorios', 'ir para os relatorios', 'abrir relatorios', 'ver relatorios', 'historico', 'historico geral', 'relatorio'],
  },
  {
    route: 'Notifications',
    label: 'Notificações',
    aliases: ['notificacoes', 'ir para notificacoes', 'avisos', 'alertas', 'mensagens'],
  },
  {
    route: 'Settings',
    label: 'Configurações',
    aliases: ['configuracoes', 'ir para configuracoes', 'abrir configuracoes', 'ajustes', 'preferencias', 'opcoes'],
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

export function parseVoiceNavigationCommand(
  rawCommand: string,
  currentRouteName?: string
): VoiceRouteMatch | null {
  const normalized = normalizeVoiceText(rawCommand);

  if (!normalized) {
    return null;
  }

  const cleanedCommand = removeNavigationPrefixes(normalized);
  const isInsideRevisionScreen = currentRouteName === 'BoxRevision';

  for (const item of VOICE_ROUTE_ALIASES) {
    if (
      item.route === 'BoxesList' &&
      isInsideRevisionScreen &&
      (cleanedCommand === 'caixa' || cleanedCommand === 'caixas')
    ) {
      continue;
    }

    for (const alias of item.aliases) {
      if (cleanedCommand === alias || cleanedCommand === normalizeVoiceText(alias)) {
        return { route: item.route, label: item.label };
      }
    }
  }

  // Fallback para frases completas com includes
  for (const item of VOICE_ROUTE_ALIASES) {
    if (
      item.route === 'BoxesList' &&
      isInsideRevisionScreen &&
      (cleanedCommand === 'caixa' || cleanedCommand === 'caixas')
    ) {
      continue;
    }

    for (const alias of item.aliases) {
      if (cleanedCommand.includes(alias)) {
        return { route: item.route, label: item.label };
      }
    }
  }

  return null;
}
