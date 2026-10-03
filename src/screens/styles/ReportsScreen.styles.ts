import { StyleSheet } from 'react-native';
import type { AppThemeColors } from '../../theme/themes';
import { createCommonStyles } from '../../theme/commonStyles';

export function createStyles(colors: AppThemeColors) {
  const common = createCommonStyles(colors);

  return StyleSheet.create({
    safeArea: common.safeArea,
    modalOverlay: common.modalOverlay,
    modalContent: common.modalContent,
    emptyCard: {
      ...common.emptyCard,
      paddingVertical: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 16,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginHorizontal: 4,
    },
    emptyTitle: common.emptyTitle,
    emptySubtitle: common.emptySubtitle,

    content: {
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 24,
      gap: 14,
    },

    // 1. Navegação em Abas Segmentadas
    segmentedContainer: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 4,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      gap: 6,
    },
    segmentBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: 'transparent',
    },
    segmentBtnActiveRevisao: {
      backgroundColor: '#059669',
      shadowColor: '#059669',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 3,
    },
    segmentBtnActiveManejo: {
      backgroundColor: '#D97706',
      shadowColor: '#D97706',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 3,
    },
    segmentText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textMuted,
    },
    segmentTextActive: {
      color: '#FFFFFF',
      fontWeight: '800',
    },

    // 2. Filtros Rápidos (Chips)
    filterChipsRow: {
      flexDirection: 'row',
      gap: 8,
      paddingVertical: 2,
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    filterChipActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 2,
    },
    filterChipText: {
      fontSize: 12.5,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    filterChipTextActive: {
      color: colors.buttonText || '#FFFFFF',
      fontWeight: '800',
    },

    // 3. Barra de Busca
    searchContainerFull: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingHorizontal: 12,
      height: 44,
      gap: 8,
    },
    searchInputFull: {
      flex: 1,
      fontSize: 14,
      color: colors.textPrimary,
      fontWeight: '500',
      paddingVertical: 0,
    },

    // 4. Seletor de Apiário
    pickerSection: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      gap: 8,
    },
    pickerSectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    pickerItemRow: {
      flexDirection: 'row',
      gap: 8,
    },
    pickerItemButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    pickerItemButtonActive: {
      backgroundColor: colors.accentSoft,
      borderColor: colors.accent,
    },
    pickerItemText: {
      fontSize: 12.5,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    pickerItemTextActive: {
      color: colors.accent,
      fontWeight: '800',
    },

    // 5. Cards de Resumo e Gráficos (quando aplicável)
    summaryCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.card,
      padding: 14,
      gap: 8,
    },
    cardTitle: {
      fontSize: 16,
      color: colors.textPrimary,
      fontWeight: '800',
    },
    summaryText: {
      fontSize: 14,
      lineHeight: 21,
      color: colors.textPrimary,
    },
    chartCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.card,
      padding: 14,
      gap: 10,
    },
    chartGrid: {
      height: 160,
      borderLeftWidth: 1.5,
      borderBottomWidth: 1.5,
      borderColor: colors.cardBorder,
      flexDirection: 'row',
      justifyContent: 'space-evenly',
      alignItems: 'flex-end',
      paddingHorizontal: 8,
      paddingBottom: 6,
      backgroundColor: colors.accentSoft,
      borderRadius: 8,
    },
    barGroup: {
      width: 32,
      height: '100%',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 4,
    },
    bar: {
      width: 24,
      minHeight: 8,
      borderRadius: 4,
      backgroundColor: colors.accent,
    },
    barLabel: {
      fontSize: 11,
      color: colors.textMuted,
      fontWeight: '600',
    },
  });
}
