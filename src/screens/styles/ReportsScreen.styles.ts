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
    modalOverlay: common.modalOverlay,
    modalContent: common.modalContent,
    emptyCard: {
      paddingVertical: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 18,
      backgroundColor: '#FFFFFF',
      borderWidth: 1.5,
      borderColor: PALETTE.secondaryLight,
      marginHorizontal: 4,
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: PALETTE.primaryDark,
      marginTop: 8,
    },
    emptySubtitle: {
      fontSize: 13.5,
      color: PALETTE.secondaryDark,
      textAlign: 'center',
      lineHeight: 19,
      marginTop: 4,
      paddingHorizontal: 20,
    },

    content: {
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 28,
      gap: 14,
    },

    // 1. Navegação em Abas Segmentadas
    segmentedContainer: {
      flexDirection: 'row',
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: 6,
      borderWidth: 1.5,
      borderColor: PALETTE.secondaryLight,
      gap: 8,
    },
    segmentBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: 'transparent',
    },
    segmentBtnActiveRevisao: {
      backgroundColor: PALETTE.primaryDark,
      shadowColor: PALETTE.primaryDark,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 3,
    },
    segmentBtnActiveManejo: {
      backgroundColor: PALETTE.secondaryLight,
      shadowColor: PALETTE.secondaryLight,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 3,
    },
    segmentText: {
      fontSize: 15,
      fontWeight: '700',
      color: PALETTE.secondaryDark,
    },
    segmentTextActive: {
      color: '#FFFFFF',
      fontWeight: '800',
    },

    // 2. Filtros Rápidos (Chips)
    filterChipsRow: {
      flexDirection: 'row',
      gap: 8,
      paddingVertical: 4,
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: '#FFFFFF',
      borderWidth: 1.5,
      borderColor: PALETTE.secondaryDark,
    },
    filterChipActive: {
      backgroundColor: PALETTE.primaryDark,
      borderColor: PALETTE.primaryDark,
      shadowColor: PALETTE.primaryDark,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 2,
    },
    filterChipText: {
      fontSize: 13.5,
      fontWeight: '600',
      color: PALETTE.primaryDark,
    },
    filterChipTextActive: {
      color: '#FFFFFF',
      fontWeight: '800',
    },

    // 3. Barra de Busca
    searchContainerFull: {
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
    searchInputFull: {
      flex: 1,
      fontSize: 16,
      color: PALETTE.primaryDark,
      fontWeight: '500',
      paddingVertical: 0,
    },

    // 4. Seletor de Apiário
    pickerSection: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: 14,
      borderWidth: 1.5,
      borderColor: PALETTE.secondaryLight,
      gap: 10,
    },
    pickerSectionLabel: {
      fontSize: 13,
      fontWeight: '800',
      color: PALETTE.primaryDark,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    pickerItemRow: {
      flexDirection: 'row',
      gap: 8,
    },
    pickerItemButton: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: PALETTE.lightSurface,
      borderWidth: 1,
      borderColor: PALETTE.secondaryLight,
    },
    pickerItemButtonActive: {
      backgroundColor: PALETTE.primaryDark,
      borderColor: PALETTE.primaryDark,
    },
    pickerItemText: {
      fontSize: 13.5,
      fontWeight: '600',
      color: PALETTE.primaryDark,
    },
    pickerItemTextActive: {
      color: '#FFFFFF',
      fontWeight: '800',
    },

    // 5. Cards de Resumo e Gráficos
    summaryCard: {
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: PALETTE.secondaryLight,
      backgroundColor: '#FFFFFF',
      padding: 16,
      gap: 10,
    },
    cardTitle: {
      fontSize: 17,
      color: PALETTE.primaryDark,
      fontWeight: '800',
    },
    summaryText: {
      fontSize: 15,
      lineHeight: 22,
      color: PALETTE.primaryDark,
    },
    chartCard: {
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: PALETTE.secondaryLight,
      backgroundColor: '#FFFFFF',
      padding: 16,
      gap: 12,
    },
    chartGrid: {
      height: 180,
      borderLeftWidth: 1.5,
      borderBottomWidth: 1.5,
      borderColor: PALETTE.secondaryLight,
      flexDirection: 'row',
      justifyContent: 'space-evenly',
      alignItems: 'flex-end',
      paddingHorizontal: 8,
      paddingBottom: 8,
      backgroundColor: PALETTE.lightSurface,
      borderRadius: 10,
    },
    barGroup: {
      width: 36,
      height: '100%',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 6,
    },
    bar: {
      width: 26,
      minHeight: 10,
      borderRadius: 6,
      backgroundColor: PALETTE.primaryDark,
    },
    barLabel: {
      fontSize: 12,
      color: PALETTE.primaryDark,
      fontWeight: '700',
    },
  });
}
