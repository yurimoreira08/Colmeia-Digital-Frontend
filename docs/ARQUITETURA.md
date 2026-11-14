# Arquitetura — Colmeia Digital Mobile

App **Android-first** do Colmeia Digital (projeto FAPEPI) para apicultores e técnicos registrarem apiários, caixas (colmeias), revisões e manejos **no campo, sem internet**.
Backend: [Colmeia-Digital-Backend](https://github.com/yurimoreira08/Colmeia-Digital-Backend) (Express + Prisma + Supabase).

## Stack

- Expo SDK 54, React Native 0.81, React 19, TypeScript strict, React Navigation 7 (native-stack).
- `expo-sqlite` (banco local), `expo-secure-store` (token), AsyncStorage (aceite de termos).
- `expo-image-picker` / `expo-image-manipulator` (fotos), `expo-print` + `expo-sharing` (PDF), `expo-media-library` (salvar na galeria).
- `expo-speech-recognition` (comandos de voz), `expo-notifications`.
- Fontes Inter e Poppins. Temas em `src/theme/`: `petroleo-digital` (padrão), `verde-floresta`, `obsidian-dark`.
- Build: EAS (`eas.json`), owner `yurikauan08`, pacote `com.colmeiadigital.app`.

## Estrutura

```
App.tsx → SafeAreaProvider → ThemeProvider → TestDataModeProvider → AppNavigator
src/navigation/AppNavigator.tsx   stack único (Splash → Terms → Login/Register → Home → ...)
src/screens/                      telas (+ styles/*.styles.ts separados)
src/components/                   componentes reutilizáveis (AppHeader, BottomDock, ...)
src/hooks/                        lógica das telas (useBoxManejo, useBoxesList, useReports, useAutoSync, ...)
src/services/                     dados: *Service.ts lê e grava o SQLite local; syncService.ts conversa com a API
src/services/apiClient.ts         fetch com Bearer token; erros viram Error com .status e .data
src/services/localDbService.ts    schema do SQLite + CRUD local (arquivo grande, ~1600 linhas)
src/utils/                        utilitários (datas, política de senha, ...)
src/voice/                        comandos de voz (contexto, rotas de voz, botão global)
src/types/                        tipos de domínio
```

## Endereço da API

`src/config/variables.ts`:
- em `__DEV__`: `EXPO_PUBLIC_API_URL` ou o IP do Metro (`http://<ip>:4000`; `10.0.2.2` no emulador);
- em release: exige `EXPO_PUBLIC_API_URL`, definida nos perfis `preview` e `production` do `eas.json`, com teste em `tests/config/easBuildProfiles.test.ts`.

O `apiClient.ts` também aceita uma URL salva em `app_config.custom_backend_url`.

## Offline-first e sincronização

Este é o ponto mais delicado do app.

- Toda escrita vai primeiro ao SQLite com `synced = 0` (e `is_new = 1` quando criada offline). Exclusões feitas offline vão para `offline_deletions`.
- `syncService.syncOfflineData()` é disparado pelo `useAutoSync` (em intervalos e quando o app volta ao primeiro plano) e pelo `bootstrapAuth`. A ordem é:
  1. envia as exclusões pendentes;
  2. envia apiários → caixas → revisões → manejos (com upload de foto) → notificações lidas;
  3. baixa tudo e aplica com `replace*Local`, preservando as linhas ainda não sincronizadas.
- Quando um registro é criado no servidor, `updateRecordSyncStatus` troca o id local pelo id do servidor e re-aponta os filhos (`apiary_id`, `caixa_id`, `revisao_id`).
  - **Ids locais são negativos** (o servidor só gera positivos), então a troca nunca colide com outro registro local pendente. Registros pendentes de versões antigas, com ids positivos, são renumerados uma vez no `initializeLocalDb`. Testes em `tests/services/localIds.test.ts`. Na limpeza de caixas duplicadas fica a do servidor; entre caixas só locais, a mais antiga.
- Revisões e manejos levam `client_uuid` para que o backend não duplique registros reenviados.
- Erro 401 pausa o sync. Erro 403 de apiário marca o registro como resolvido.
- Login ou cadastro de **outro usuário** limpa todo o SQLite (`handleUserSessionSwitch`). O logout também.

## Sessão

- O token fica **só** no `expo-secure-store` (`auth_token`).
- O `currentUser` fica em `app_config` do SQLite, em texto puro, e é usado para entrar sem internet. Sempre grave pelo `saveCurrentUser()` do `authService`, que remove `token` e `passwordHash`. Nunca use `setLocalConfigValue("currentUser", ...)` direto.
- O backup automático do Android está desligado (`allowBackup: false`), com teste em `tests/config/appConfig.test.ts`.

## Senhas

Senhas novas (cadastro e redefinição) passam por `validateNewPassword()` de `src/utils/passwordPolicy.ts`: de 8 a 72 caracteres, sem trim (espaços contam). É a mesma regra do backend, que é quem decide. O login não valida tamanho, porque contas antigas podem ter senhas curtas. Nunca aplique `trim()` numa senha antes de enviar.

## Arquivos mantidos de propósito

- `build_assets.ps1` e `assets/export_assets.html`: geração de ícones.
- `src/services/appConfigService.web.ts`: não tem import direto, mas o Metro o usa no lugar do `.ts` na versão web.
