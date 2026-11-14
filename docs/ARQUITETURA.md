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
src/services/localDbService.ts    ponto de entrada do banco local (reexporta localDb/)
src/services/localDb/             SQLite por assunto: database, schema (migrações), config, syncState,
                                  apiaries, boxes, reviewReports, manejos, notifications, remotePull
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
- `syncService.syncOfflineData()` é disparado pelo `useAutoSync` (em intervalos e quando o app volta ao primeiro plano) e pelo `bootstrapAuth`. As etapas ficam em `services/sync/`:
  1. **Envio em lote** (`batchPush.ts`, `POST /sync`): exclusões, apiários, caixas, revisões e manejos pendentes, até 50 de cada por requisição. Filhos de um pai criado offline vão no mesmo lote (o servidor liga os ids negativos) ou na rodada seguinte. A foto do manejo sobe antes e o lote leva só a URL.
     - Cada item volta com um resultado. `created`/`updated` trocam o id local pelo do servidor. `conflict` (o registro mudou no servidor depois que o aparelho o baixou) mantém a versão do servidor e cria a notificação local "Alteração não aplicada". `rejected` tira o item da fila e força um download completo. `error` deixa o item para a próxima vez.
     - Para detectar conflito, cada registro guarda em `server_updated_at` o `updatedAt` do servidor, que vai como `baseUpdatedAt`.
  2. Notificações lidas (`legacy.ts`, uma requisição cada).
  3. **Download incremental** (`pull.ts`, `GET /sync/changes?since=`): só o que mudou desde o `serverTime` guardado em `app_config.sync_since`, mais as exclusões feitas no servidor (o app apaga também os filhos). O primeiro download, o que vem depois de recusas e o que vem depois de limpar o banco (logout, troca de usuário) são completos e substituem o que está sincronizado, preservando as linhas ainda não enviadas.
  - Servidor sem as rotas novas (404) ou que recusa o formato do lote (422): `legacy.ts` faz o sync antigo, uma requisição por registro e as listagens completas.
  - Testes em `tests/services/batchSync.test.ts`.
- Quando um registro é criado no servidor, `updateRecordSyncStatus` troca o id local pelo id do servidor e re-aponta os filhos (`apiary_id`, `caixa_id`, `revisao_id`).
  - **Ids locais são negativos** (o servidor só gera positivos), então a troca nunca colide com outro registro local pendente. Registros pendentes de versões antigas, com ids positivos, são renumerados uma vez no `initializeLocalDb`. Testes em `tests/services/localIds.test.ts`. Na limpeza de caixas duplicadas fica a do servidor; entre caixas só locais, a mais antiga.
- Revisões e manejos levam `client_uuid` para que o backend não duplique registros reenviados.
- Erro 401 pausa o sync. Erro 403 de apiário marca o registro como resolvido.
- **Conexão:** `checkServerConnection` (em `apiClient`) consulta o `/health` com timeout de 3 s, reaproveita o resultado (30 s online, 10 s offline) e junta chamadas simultâneas. Assim, o cold start do Render não trava a abertura nem o logout. Testes em `tests/services/connectionCheck.test.ts`.
- **Indicador no cabeçalho:** o `AppHeader` mostra o `SyncStatusButton`, alimentado por `subscribeToSyncStatus` via `useSyncStatus`. Ele indica se está sincronizando, se há alterações pendentes (com contador), se o envio falhou ou se está tudo enviado. O toque pede um sync. O `syncOfflineData` avisa os inscritos também quando adia o sync (sem rede ou sem login), para que o contador inclua o que acabou de ser criado offline.
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
