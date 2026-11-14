/**
 * Edição de uma revisão já salva: segue as mesmas regras entre itens da
 * revisão nova.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { EditReportNotesScreen } from '../../src/screens/EditReportNotesScreen';
import { updateRevision } from '../../src/services/reviewReportService';
import type { RootStackParamList } from '../../src/types/auth';
import type { ReviewReport } from '../../src/types/reviewReport';

jest.setTimeout(30_000);

jest.mock('../../src/services/reviewReportService', () => ({ updateRevision: jest.fn(async () => undefined) }));
jest.mock('../../src/services/sessionStore', () => ({ markBoxModifiedInSession: jest.fn() }));
jest.mock('../../src/components/AppHeader', () => ({ AppHeader: () => null }));
jest.mock('../../src/theme/ThemeContext', () => {
  const { themes } = jest.requireActual('../../src/theme/themes');
  return { useAppTheme: () => ({ colors: themes['petroleo-digital'] }) };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});

const report = { id: 100, caixaId: 10, observacoes: '', indicacoes: '', checkedOptions: ['caixa'] } as unknown as ReviewReport;

async function renderScreen() {
  const navigation = { goBack: jest.fn() };
  const props = { navigation, route: { key: 'EditReportNotes', name: 'EditReportNotes', params: { report } } } as unknown as NativeStackScreenProps<RootStackParamList, 'EditReportNotes'>;
  await render(<EditReportNotesScreen {...props} />);
}

it('marcar ovos marca a rainha, e núcleo desmarca caixa', async () => {
  await renderScreen();

  await fireEvent.press(screen.getByText('Ovos'));
  await fireEvent.press(screen.getByText('Núcleo'));
  await fireEvent.press(screen.getByText('Salvar Alterações'));

  await waitFor(() => expect(updateRevision).toHaveBeenCalled());
  expect(jest.mocked(updateRevision).mock.calls[0][1].checkedOptions.sort()).toEqual(['nucleo', 'ovos', 'rainha']);
});
