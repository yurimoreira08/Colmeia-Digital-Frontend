import { StyleSheet } from 'react-native';
import type { AppThemeColors } from '../../theme/themes';
import { createCommonStyles } from '../../theme/commonStyles';

export function createStyles(colors: AppThemeColors) {
  const common = createCommonStyles(colors);

  return StyleSheet.create({
    safeArea: common.safeArea,
    input: common.input,
    content: {
      paddingHorizontal: 18,
      paddingTop: 16,
      paddingBottom: 40,
      gap: 14,
    },
    textArea: {
      minHeight: 120,
      textAlignVertical: 'top',
      paddingVertical: 12,
    },
    errorText: {
      alignSelf: 'flex-start',
      color: colors.error,
      fontSize: 13,
      fontWeight: '500',
    },
    submitButton: {
      marginTop: 12,
      minWidth: 236,
      height: 54,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      paddingHorizontal: 22,
    },
    submitButtonText: {
      fontSize: 15,
      color: colors.buttonText,
      textAlign: 'center',
      fontWeight: '600',
    },
  });
}
