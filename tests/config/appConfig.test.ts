/**
 * O SQLite do app guarda dados de campo e o perfil do usuário em texto puro.
 * Com o backup do Android ligado, esses dados iriam para o backup na nuvem e
 * poderiam ser extraídos via adb. Este teste impede que ele volte a ser ligado.
 */
import appConfig from '../../app.json';

describe('configuração Android do app.json', () => {
  it('desativa o backup automático do Android', () => {
    expect(appConfig.expo.android.allowBackup).toBe(false);
  });
});
