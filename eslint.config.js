// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'dist/',
      'android/',
      'ios/',
      '.expo/',
      'node_modules/',
      // Scripts avulsos e sem uso pelo app (item F7 do relatório); serão removidos.
      'fix-screens.js',
      'src/check-git-rn.ts',
      'assets/export_assets.html',
    ],
  },
  {
    files: ['tests/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { jest: 'readonly', describe: 'readonly', it: 'readonly', expect: 'readonly', beforeEach: 'readonly' },
    },
  },
  {
    // O plugin @typescript-eslint do eslint-config-expo só vale para arquivos TS.
    files: ['**/*.{ts,tsx}'],
    rules: {
      // Variáveis descartadas de propósito (ex.: `{ token: _token, ...rest }`).
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
      // Regra pensada para HTML na web. No React Native, aspas dentro de <Text>
      // são texto comum e escapar com &quot; só piora a leitura das telas.
      'react/no-unescaped-entities': 'off',
    },
  },
]);
