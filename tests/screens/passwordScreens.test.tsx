/**
 * Telas de cadastro e redefinição de senha: a política de senha é aplicada
 * antes de chamar a API, e a senha é enviada exatamente como digitada.
 *
 * Na Testing Library 14, render e fireEvent são assíncronos (sempre com await).
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RegisterScreen } from '../../src/screens/RegisterScreen';
import { ResetPasswordScreen } from '../../src/screens/ResetPasswordScreen';
import { register, resetPassword } from '../../src/services/authService';
import type { RootStackParamList } from '../../src/types/auth';

// O primeiro render carrega e transforma o React Native inteiro: com cache frio
// (CI ou clone novo) passa dos 5 s padrão do Jest.
jest.setTimeout(30_000);

jest.mock('../../src/services/authService', () => ({
  register: jest.fn(async () => ({ id: 1 })),
  resetPassword: jest.fn(async () => ({ success: true, message: 'ok' })),
}));

jest.mock('../../src/theme/ThemeContext', () => {
  const { themes } = jest.requireActual('../../src/theme/themes');
  return { useAppTheme: () => ({ colors: themes['petroleo-digital'] }) };
});

jest.mock('@expo/vector-icons', () => ({ MaterialCommunityIcons: () => null }));

jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return {
    SafeAreaView: View,
    SafeAreaProvider: View,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

/** Props mínimas de navegação para renderizar uma tela fora do navigator. */
function navigationProps<Name extends keyof RootStackParamList>(
  name: Name,
  params: RootStackParamList[Name],
): NativeStackScreenProps<RootStackParamList, Name> {
  const navigation = { navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn(), reset: jest.fn() };
  // Só os métodos que as telas usam; o resto da API de navegação não interessa aqui.
  return { navigation, route: { key: name, name, params } } as unknown as NativeStackScreenProps<RootStackParamList, Name>;
}

beforeEach(() => {
  jest.mocked(register).mockClear();
  jest.mocked(resetPassword).mockClear();
});

describe('RegisterScreen', () => {
  async function fillForm(password: string) {
    await fireEvent.changeText(screen.getByPlaceholderText('Nome completo...'), 'Apicultora Teste');
    await fireEvent.changeText(screen.getByPlaceholderText('E-mail de acesso...'), 'teste@example.com');
    await fireEvent.changeText(screen.getByPlaceholderText('Senha (mínimo 8 caracteres)...'), password);
    await fireEvent.press(screen.getByRole('button', { name: 'Cadastrar' }));
  }

  it('mostra a regra e não chama a API quando a senha tem menos de 8 caracteres', async () => {
    await render(<RegisterScreen {...navigationProps('Register', undefined)} />);

    await fillForm('1234567');

    expect(await screen.findByText('A senha deve ter pelo menos 8 caracteres.')).toBeTruthy();
    expect(register).not.toHaveBeenCalled();
  });

  it('envia a senha exatamente como digitada', async () => {
    await render(<RegisterScreen {...navigationProps('Register', undefined)} />);

    await fillForm('  senha com espaços  ');

    await waitFor(() => expect(register).toHaveBeenCalledTimes(1));
    expect(jest.mocked(register).mock.calls[0][0]).toMatchObject({ password: '  senha com espaços  ' });
  });
});

describe('ResetPasswordScreen', () => {
  async function fillForm(password: string, confirmation = password) {
    await fireEvent.changeText(screen.getByPlaceholderText('000000'), '123456');
    await fireEvent.changeText(screen.getByPlaceholderText('Mínimo 8 caracteres...'), password);
    await fireEvent.changeText(screen.getByPlaceholderText('Repita a nova senha...'), confirmation);
    await fireEvent.press(screen.getByRole('button', { name: 'Redefinir senha' }));
  }

  it('mostra a regra e não chama a API quando a nova senha tem menos de 8 caracteres', async () => {
    await render(<ResetPasswordScreen {...navigationProps('ResetPassword', { email: 'teste@example.com' })} />);

    await fillForm('curta');

    expect(await screen.findByText('A senha deve ter pelo menos 8 caracteres.')).toBeTruthy();
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it('envia a nova senha sem remover espaços', async () => {
    await render(<ResetPasswordScreen {...navigationProps('ResetPassword', { email: 'teste@example.com' })} />);

    await fillForm('  nova senha 123  ');

    await waitFor(() => expect(resetPassword).toHaveBeenCalledTimes(1));
    expect(resetPassword).toHaveBeenCalledWith({ email: 'teste@example.com', code: '123456', newPassword: '  nova senha 123  ' });
  });
});
