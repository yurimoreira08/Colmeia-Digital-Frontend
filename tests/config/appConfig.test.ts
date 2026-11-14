/**
 * @jest-environment node
 */
/**
 * Regras do app.json que já quebraram ou podem quebrar sem aviso.
 *
 * - Backup do Android: o SQLite guarda dados de campo e o perfil do usuário em
 *   texto puro. Com o backup ligado, esses dados iriam para a nuvem e poderiam
 *   ser extraídos via adb.
 * - Ícones: o Expo exige PNG (achado F11). JPEG sai com fundo ou recorte
 *   errado em alguns launchers e faz o expo-doctor falhar.
 */
import fs from 'fs';
import path from 'path';

import appConfig from '../../app.json';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe('configuração Android do app.json', () => {
  it('desativa o backup automático do Android', () => {
    expect(appConfig.expo.android.allowBackup).toBe(false);
  });
});

describe('ícones', () => {
  it.each([
    ['icon', appConfig.expo.icon],
    ['android.adaptiveIcon.foregroundImage', appConfig.expo.android.adaptiveIcon.foregroundImage],
  ])('%s é um arquivo PNG de verdade', (_field, file) => {
    const bytes = fs.readFileSync(path.join(__dirname, '..', '..', file));

    expect(file.endsWith('.png')).toBe(true);
    expect(bytes.subarray(0, 8).equals(PNG_SIGNATURE)).toBe(true);
  });
});
