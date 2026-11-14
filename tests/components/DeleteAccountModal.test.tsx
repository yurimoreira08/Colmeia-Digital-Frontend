/**
 * Modal de exclusão da conta: só confirma com a senha digitada e mostra o
 * erro (ex.: senha incorreta) sem fechar.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { DeleteAccountModal } from '../../src/components/DeleteAccountModal';

jest.setTimeout(30_000);

jest.mock('../../src/theme/ThemeContext', () => {
  const { themes } = jest.requireActual('../../src/theme/themes');
  return { useAppTheme: () => ({ colors: themes['petroleo-digital'] }) };
});

it('o botão só libera com a senha, e a senha vai como foi digitada', async () => {
  const onConfirm = jest.fn(async () => undefined);
  await render(<DeleteAccountModal visible onCancel={jest.fn()} onConfirm={onConfirm} />);

  const button = screen.getByRole('button', { name: 'Excluir conta' });
  expect(button.props.accessibilityState).toMatchObject({ disabled: true });

  await fireEvent.changeText(screen.getByLabelText('Senha para confirmar a exclusão'), ' minha senha ');
  await fireEvent.press(screen.getByRole('button', { name: 'Excluir conta' }));

  await waitFor(() => expect(onConfirm).toHaveBeenCalledWith(' minha senha '));
});

it('mostra o erro e continua aberto', async () => {
  const onConfirm = jest.fn(async () => {
    throw new Error('Senha incorreta.');
  });
  await render(<DeleteAccountModal visible onCancel={jest.fn()} onConfirm={onConfirm} />);

  await fireEvent.changeText(screen.getByLabelText('Senha para confirmar a exclusão'), 'errada');
  await fireEvent.press(screen.getByRole('button', { name: 'Excluir conta' }));

  expect(await screen.findByText('Senha incorreta.')).toBeTruthy();
  expect(screen.getByText('Excluir minha conta')).toBeTruthy();
});
