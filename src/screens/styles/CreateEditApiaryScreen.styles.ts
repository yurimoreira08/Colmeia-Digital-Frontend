import { StyleSheet } from 'react-native';
import type { AppThemeColors } from '../../theme/themes';
import { PALETTE } from '../../theme/themes';

export function createStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 50,
      gap: 16,
    },
    inputLabel: {
      fontSize: 16,
      fontWeight: '700',
      color: PALETTE.primaryDark,
      marginBottom: 6,
    },
    input: {
      minHeight: 58,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: PALETTE.secondaryMedium,
      backgroundColor: '#FFFFFF',
      color: PALETTE.primaryDark,
      paddingHorizontal: 18,
      paddingVertical: 14,
      fontSize: 17,
      fontWeight: '500',
    },
    textArea: {
      minHeight: 140,
      textAlignVertical: 'top',
      paddingVertical: 14,
    },
    errorText: {
      alignSelf: 'flex-start',
      color: PALETTE.dangerRed,
      fontSize: 14,
      fontWeight: '600',
    },
    submitButton: {
      marginTop: 16,
      width: '100%',
      minHeight: 58,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: PALETTE.secondaryLight,
      backgroundColor: PALETTE.primaryDark,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingHorizontal: 24,
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
    },
    submitButtonText: {
      fontSize: 18,
      color: '#FFFFFF',
      textAlign: 'center',
      fontWeight: '800',
      letterSpacing: 0.3,
    },
  });
}
