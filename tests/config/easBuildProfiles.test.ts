/**
 * Em release, `src/config/variables.ts` não tem fallback: sem
 * EXPO_PUBLIC_API_URL o app não consegue falar com o backend. Este teste
 * impede que um perfil de build distribuído aos usuários fique sem a URL.
 */
import easConfig from '../../eas.json';

type BuildProfile = { env?: Record<string, string> };
const profiles = easConfig.build as Record<string, BuildProfile>;

describe.each(['preview', 'production'])('perfil de build "%s" do EAS', (profileName) => {
  it('define EXPO_PUBLIC_API_URL com HTTPS', () => {
    const apiUrl = profiles[profileName]?.env?.EXPO_PUBLIC_API_URL;

    expect(apiUrl).toBeDefined();
    expect(apiUrl).toMatch(/^https:\/\/\S+$/);
  });
});
