import { StyleSheet } from 'react-native';
import type { AppThemeColors } from '../../theme/themes';
import { PALETTE } from '../../theme/themes';
import { createCommonStyles } from '../../theme/commonStyles';

export function createStyles(colors: AppThemeColors) {
  const common = createCommonStyles(colors);

  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: PALETTE.lightSurface,
    },
    emptyCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: PALETTE.secondaryLight,
      padding: 28,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 20,
      gap: 8,
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: PALETTE.primaryDark,
      textAlign: 'center',
    },
    emptySubtitle: {
      fontSize: 14,
      color: PALETTE.secondaryDark,
      textAlign: 'center',
      lineHeight: 20,
    },
    content: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 120,
      gap: 14,
    },

    // Segmented Controller
    segmentedContainer: {
      flexDirection: 'row',
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: PALETTE.secondaryLight,
      padding: 6,
      gap: 8,
    },
    segmentBtn: {
      flex: 1,
      minHeight: 48,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    segmentBtnActiveRevisao: {
      backgroundColor: PALETTE.primaryDark,
      shadowColor: PALETTE.primaryDark,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 2,
    },
    segmentBtnActiveManejo: {
      backgroundColor: PALETTE.secondaryLight,
      shadowColor: PALETTE.secondaryLight,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 2,
    },
    segmentText: {
      fontSize: 15,
      fontWeight: '700',
      color: PALETTE.secondaryDark,
    },
    segmentTextActive: {
      color: '#FFFFFF',
      fontWeight: '900',
    },

    // Quick Filter Strip
    filterRow: {
      flexDirection: 'row',
      gap: 8,
    },
    filterPill: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      minHeight: 46,
      borderRadius: 12,
      backgroundColor: '#FFFFFF',
      borderWidth: 1.5,
      borderColor: PALETTE.secondaryDark,
    },
    filterPillActive: {
      backgroundColor: PALETTE.primaryDark,
      borderColor: PALETTE.primaryDark,
    },
    filterPillText: {
      fontSize: 13.5,
      fontWeight: '700',
      color: PALETTE.primaryDark,
    },
    filterPillTextActive: {
      color: '#FFFFFF',
      fontWeight: '800',
    },

    // Search Box
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: PALETTE.secondaryDark,
      paddingHorizontal: 14,
      height: 52,
      gap: 10,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: PALETTE.primaryDark,
      fontWeight: '600',
    },
  });
}
