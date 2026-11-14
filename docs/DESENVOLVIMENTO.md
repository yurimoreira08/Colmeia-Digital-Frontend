# Desenvolvimento — Colmeia Digital Mobile

Convenções de código e de testes. A arquitetura está em [ARQUITETURA.md](ARQUITETURA.md).

## Ao alterar código

- **Tela nova:** registre em `AppNavigator.tsx`, use `AppHeader`/`BottomDock`, coloque os estilos em `screens/styles/<Tela>.styles.ts` e use as cores do `useTheme()` (sem hex fixo no código).
- A lógica de dados fica em hooks e services, não no JSX. Toda mutação grava no SQLite com `synced = 0` e chama `triggerSyncBackground()`.
- Mudança de contrato com a API precisa ser feita junto no backend (`src/types/mobile-models.ts` de lá).
- Mexeu no schema do SQLite? Adicione uma migração idempotente em `initializeLocalDb` (`services/localDb/schema.ts`): os usuários já têm dados no aparelho.
- Botões e ícones clicáveis precisam de `accessibilityRole`, `accessibilityLabel` e área de toque de pelo menos 44–48 dp.
- Não registre no log o token, o `currentUser` nem dados pessoais.
- Mudou fluxo, tela, comando ou configuração de build? Atualize o README e os `docs/` na mesma entrega.

## Organização e legibilidade

- **Telas só montam a interface.** Estado e efeitos ficam em `hooks/`, dados em `services/` e estilos em `screens/styles/`.
- Componentes com mais de ~250 linhas ou com mais de uma responsabilidade são quebrados em subcomponentes em `components/`.
- O banco local fica em `services/localDb/`, um arquivo por entidade. Código novo entra no arquivo da entidade, e telas, hooks e services continuam importando de `localDbService` (que só reexporta).
- Ao mexer em `pdfExportService`, extraia a parte tocada para um arquivo próprio. Os modelos são a `BoxReviewScreen` e o `useReports` (cálculos em `utils/reportMetrics.ts`, voz em `voice/reportsVoiceCommands.ts`, edição em `hooks/useReportEditing.ts`). Na `BoxReviewScreen`: estado e voz em `hooks/useBoxRevision.ts`, partes da tela em `components/revision/`, regras dos itens em `utils/revisionOptions.ts` (`applyOptionSelection`, usada também nas edições) e texto falado em `voice/voiceText.ts` (compartilhado com o manejo).
- Antes de dividir uma tela grande, escreva testes de caracterização que passem no código atual (ex.: `tests/screens/boxReviewScreen.test.tsx`) e mantenha-os verdes durante a divisão.
- **Nomes** descritivos e no vocabulário do domínio (`apiary`, `box`/`caixa`, `revision`, `manejo`). Componentes em `PascalCase`, hooks começando com `use`, booleanos com `is`, `has` ou `should`.
- **Tipos:** sem `any` em código novo. Tipe as props de cada componente, os parâmetros de navegação (`RootStackParamList`) e as respostas da API (`src/types/`).
- **Documentação:**
  - JSDoc curto em hooks e funções exportadas de services: o que fazem, efeitos colaterais (grava no SQLite? dispara sync?) e erros.
  - Comentários explicam o **porquê**, principalmente nas regras de sync e na troca de ids. Não repetem o código.
  - Tudo em português.
- **Sem código morto:** nada de código comentado, `console.log` de debug, scripts avulsos ou componentes sem uso.
- **Sem duplicação:** estilos e cores vêm do tema ou de `commonStyles`. Lógica repetida em 2 ou 3 telas vira hook ou utilitário.
- **Consistência:** siga o padrão do arquivo vizinho (estrutura de tela, `useTheme()`, mensagens de erro em português para o usuário).

## Testes (Jest + jest-expo)

- Os testes ficam em `tests/`, espelhando `src/` (ex.: `tests/services/authService.test.ts`).
- **Services:** isole com `jest.mock` dos vizinhos (`localDbService`, `secureStorage`, `apiClient`), usando mapas em memória que imitam o armazenamento real, e verifique **onde** os dados foram parar.
  - Variáveis usadas dentro da factory de um `jest.mock` precisam do prefixo `mock` (ex.: `mockLocalConfig`). O `babel-jest` sobe os `jest.mock` para antes dos imports.
  - O AsyncStorage já está mapeado para o mock oficial no `package.json` (`jest.moduleNameMapper`).
- **Banco local e sync:** `tests/helpers/sqliteMemory.ts` troca o `expo-sqlite` por um SQLite em memória (better-sqlite3) com a mesma API (`execAsync`, `runAsync`, `getFirstAsync`, `getAllAsync`, `withTransactionAsync`).
  - O arquivo de teste precisa do docblock `@jest-environment node` e de `jest.mock('expo-sqlite', () => jest.requireActual('../helpers/sqliteMemory').expoSqliteMock)`.
  - No `beforeEach`, chame `resetMemoryDatabase()` e `initializeLocalDb()` para usar o schema real.
  - Ids de registros criados no aparelho são negativos: nos testes, use `insert*Local` para criar registros pendentes, e linhas com id positivo e `is_new = 1` só para simular dados de versões antigas (que o `initializeLocalDb` renumera).
- **Telas e componentes:** React Native Testing Library 14 (`tests/screens/`).
  - Na versão 14, `render` e `fireEvent` são **assíncronos**: use sempre `await`.
  - Mocke `authService`, `ThemeContext`, `@expo/vector-icons` e `react-native-safe-area-context` como em `passwordScreens.test.tsx`.
  - Encontre botões pelo papel (`getByRole('button', { name })`), o que exige `accessibilityRole`/`accessibilityLabel` no componente.
  - O primeiro render com cache frio é lento: o arquivo de tela usa `jest.setTimeout(30_000)`.
- **Teste de correção de bug:** mostre que ele falha sem a correção (`git stash push -- src` → `npm test` → `git stash pop`).

## Verificação e CI

Antes de qualquer commit, tudo precisa passar, parando no primeiro erro:

```bash
npm run typecheck && npm test && npm run lint
```

O lint precisa ter 0 erros; os avisos do código antigo são tolerados. Em mudanças de dependências ou de configuração, rode também `npx expo-doctor`. Hoje ele acusa 2 problemas antigos (ícone `.jpeg` e pacotes do Expo um patch atrás), registrados como F11 e F12 no relatório.

O CI (`.github/workflows/ci.yml`, GitHub Actions) roda `npm ci` com npm 11.6.1, tsc, eslint e jest. O `npm audit` roda mas não bloqueia, por causa das vulnerabilidades do Expo SDK 54.
