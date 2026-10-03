import { StyleSheet } from 'react-native';
import type { AppThemeColors } from '../../theme/themes';
import { createCommonStyles } from '../../theme/commonStyles';

export function createStyles(colors: AppThemeColors) {
  const common = createCommonStyles(colors);

  return StyleSheet.create({
    safeArea: common.safeArea,
    emptyCard: {
      backgroundColor: colors.card,
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      padding: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 20,
      gap: 8,
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.textPrimary,
      textAlign: 'center',
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.textMuted,
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
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      padding: 4,
      gap: 6,
    },
    segmentBtn: {
      flex: 1,
      height: 44,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    segmentBtnActiveRevisao: {
      backgroundColor: '#059669',
      shadowColor: '#059669',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 2,
    },
    segmentBtnActiveManejo: {
      backgroundColor: '#D97706',
      shadowColor: '#D97706',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 2,
    },
    segmentText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textMuted,
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
      height: 42,
      borderRadius: 12,
      backgroundColor: colors.card,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
    },
    filterPillActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    filterPillText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    filterPillTextActive: {
      color: colors.buttonText || '#FFFFFF',
      fontWeight: '900',
    },

    // Search Bar
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      paddingHorizontal: 14,
      height: 48,
      gap: 10,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
      paddingVertical: 0,
    },
  });
}
