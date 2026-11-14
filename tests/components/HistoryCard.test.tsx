/**
 * Cartão do histórico com leitor de tela (F14): no Android o cartão é lido
 * como um bloco só e os botões de dentro ficam fora de alcance. As mesmas
 * ações precisam estar no menu de ações do leitor de tela.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';

import { HistoryCard } from '../../src/components/HistoryCard';

jest.setTimeout(30_000);

jest.mock('../../src/theme/ThemeContext', () => {
  const { themes } = jest.requireActual('../../src/theme/themes');
  return { useAppTheme: () => ({ colors: themes['petroleo-digital'] }) };
});
jest.mock('@expo/vector-icons', () => ({ MaterialCommunityIcons: () => null }));

const revision = { id: 300, createdAt: '2026-06-01T12:00:00.000Z', checkedOptions: ['mel'], observacoes: 'Calma', indicacoes: '', archived: false };

it('oferece editar, excluir, arquivar e baixar como ações do leitor de tela', async () => {
  const handlers = { onEdit: jest.fn(), onDelete: jest.fn(), onArchive: jest.fn(), onDownload: jest.fn() };
  await render(<HistoryCard item={revision} type="revisao" {...handlers} />);

  const card = screen.getByRole('summary');
  expect(card.props.accessibilityActions.map((a: { label: string }) => a.label)).toEqual(['Editar registro', 'Excluir registro', 'Arquivar', 'Baixar PDF']);

  for (const [name, handler] of [['edit', handlers.onEdit], ['delete', handlers.onDelete], ['archive', handlers.onArchive], ['download', handlers.onDownload]] as const) {
    await fireEvent(card, 'accessibilityAction', { nativeEvent: { actionName: name } });
    expect(handler).toHaveBeenCalledWith(revision);
  }
});

it('no modo de seleção é uma caixa de seleção com o estado marcado', async () => {
  await render(<HistoryCard item={revision} type="revisao" selectionMode isSelected onToggleSelection={jest.fn()} onEdit={jest.fn()} />);

  const card = screen.getByRole('checkbox');
  expect(card.props.accessibilityState).toEqual({ checked: true });
  // Editar e excluir somem na seleção: o leitor de tela também não oferece.
  expect(card.props.accessibilityActions).toEqual([]);
});
