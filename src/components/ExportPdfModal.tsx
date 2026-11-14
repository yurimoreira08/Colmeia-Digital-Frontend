import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PALETTE } from '../theme/themes';
import {
  calculateDateRange,
  exportGroupReportsPdf,
  type TimeFilterPeriod,
} from '../services/pdfExportService';
import { listRevisionReports } from '../services/reviewReportService';
import { listManejoReports } from '../services/manejoService';

type Props = {
  visible: boolean;
  onClose: () => void;
  targetTitle: string;
  targetSubtitle?: string;
  apiaryId?: number;
  apiaryName?: string;
  apiaryLocation?: string;
  caixaId?: number;
  boxName?: string;
};

export function ExportPdfModal({
  visible,
  onClose,
  targetTitle,
  targetSubtitle,
  apiaryId,
  apiaryName,
  apiaryLocation,
  caixaId,
  boxName,
}: Props) {
  const [period, setPeriod] = useState<TimeFilterPeriod>('30days');
  const [typeFilter, setTypeFilter] = useState<'all' | 'revisoes' | 'manejos'>('all');
  const [loading, setLoading] = useState(false);

  async function handleGeneratePdf() {
    try {
      setLoading(true);
      const { fromDate, toDate, label: periodLabel } = calculateDateRange(period);

      const fetchRevisoes = typeFilter === 'all' || typeFilter === 'revisoes';
      const fetchManejos = typeFilter === 'all' || typeFilter === 'manejos';

      const [revisoes, manejos] = await Promise.all([
        fetchRevisoes
          ? listRevisionReports({
              apiaryId,
              caixaId,
              fromDate,
              toDate,
            })
          : Promise.resolve([]),
        fetchManejos
          ? listManejoReports({
              apiaryId,
              caixaId,
              fromDate,
              toDate,
            })
          : Promise.resolve([]),
      ]);

      await exportGroupReportsPdf({
        title: `Relatório Técnico - ${targetTitle}`,
        apiaryName: apiaryName || (apiaryId ? targetTitle : undefined),
        apiaryLocation,
        boxName,
        periodLabel,
        revisoes,
        manejos,
      });

      onClose();
    } catch (err) {
      console.error('[ExportPdfModal] Erro ao gerar PDF:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header do Modal */}
          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <MaterialCommunityIcons name="file-pdf-box" size={28} color="#DC2626" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Exportar Relatório PDF</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {targetTitle}
              </Text>
              {targetSubtitle ? (
                <Text style={styles.caption}>{targetSubtitle}</Text>
              ) : null}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={22} color={PALETTE.secondaryDark} />
            </Pressable>
          </View>

          {/* 1. Filtro de Período de Tempo */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Selecione o Período de Tempo:</Text>
            <View style={styles.periodGrid}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: period === '7days' }}
                style={[styles.periodChip, period === '7days' ? styles.periodChipActive : null]}
                onPress={() => setPeriod('7days')}
              >
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={16}
                  color={period === '7days' ? '#FFFFFF' : PALETTE.primaryDark}
                />
                <Text style={[styles.periodChipText, period === '7days' ? styles.periodChipTextActive : null]}>
                  7 Dias
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: period === '30days' }}
                style={[styles.periodChip, period === '30days' ? styles.periodChipActive : null]}
                onPress={() => setPeriod('30days')}
              >
                <MaterialCommunityIcons
                  name="calendar-range"
                  size={16}
                  color={period === '30days' ? '#FFFFFF' : PALETTE.primaryDark}
                />
                <Text style={[styles.periodChipText, period === '30days' ? styles.periodChipTextActive : null]}>
                  30 Dias
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: period === 'thisMonth' }}
                style={[styles.periodChip, period === 'thisMonth' ? styles.periodChipActive : null]}
                onPress={() => setPeriod('thisMonth')}
              >
                <MaterialCommunityIcons
                  name="calendar-month-outline"
                  size={16}
                  color={period === 'thisMonth' ? '#FFFFFF' : PALETTE.primaryDark}
                />
                <Text style={[styles.periodChipText, period === 'thisMonth' ? styles.periodChipTextActive : null]}>
                  Mês Atual
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: period === '3months' }}
                style={[styles.periodChip, period === '3months' ? styles.periodChipActive : null]}
                onPress={() => setPeriod('3months')}
              >
                <MaterialCommunityIcons
                  name="history"
                  size={16}
                  color={period === '3months' ? '#FFFFFF' : PALETTE.primaryDark}
                />
                <Text style={[styles.periodChipText, period === '3months' ? styles.periodChipTextActive : null]}>
                  3 Meses
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: period === 'all' }}
                style={[styles.periodChip, period === 'all' ? styles.periodChipActive : null, { minWidth: '100%' }]}
                onPress={() => setPeriod('all')}
              >
                <MaterialCommunityIcons
                  name="all-inclusive"
                  size={16}
                  color={period === 'all' ? '#FFFFFF' : PALETTE.primaryDark}
                />
                <Text style={[styles.periodChipText, period === 'all' ? styles.periodChipTextActive : null]}>
                  Todo o Histórico (Completo)
                </Text>
              </Pressable>
            </View>
          </View>

          {/* 2. Filtro de Tipo de Atividade */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Tipo de Atividade:</Text>
            <View style={styles.typeRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: typeFilter === 'all' }}
                style={[styles.typeBtn, typeFilter === 'all' ? styles.typeBtnActive : null]}
                onPress={() => setTypeFilter('all')}
              >
                <Text style={[styles.typeBtnText, typeFilter === 'all' ? styles.typeBtnTextActive : null]}>
                  Tudo
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: typeFilter === 'revisoes' }}
                style={[styles.typeBtn, typeFilter === 'revisoes' ? styles.typeBtnActive : null]}
                onPress={() => setTypeFilter('revisoes')}
              >
                <Text style={[styles.typeBtnText, typeFilter === 'revisoes' ? styles.typeBtnTextActive : null]}>
                  Revisões
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: typeFilter === 'manejos' }}
                style={[styles.typeBtn, typeFilter === 'manejos' ? styles.typeBtnActive : null]}
                onPress={() => setTypeFilter('manejos')}
              >
                <Text style={[styles.typeBtnText, typeFilter === 'manejos' ? styles.typeBtnTextActive : null]}>
                  Manejos
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Botões de Ação */}
          <View style={styles.actionsRow}>
            <Pressable accessibilityRole="button" style={styles.cancelBtn} onPress={onClose} disabled={loading}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              style={[styles.confirmBtn, loading ? styles.confirmBtnDisabled : null]}
              onPress={handleGeneratePdf}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MaterialCommunityIcons name="download" size={18} color="#FFFFFF" />
                  <Text style={styles.confirmBtnText}>Gerar e Baixar PDF</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 420,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 14,
    marginBottom: 16,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: PALETTE.primaryDark,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: PALETTE.mutedText,
    marginTop: 2,
  },
  caption: {
    fontSize: 12,
    color: PALETTE.secondaryDark,
    marginTop: 1,
  },
  closeBtn: {
    padding: 4,
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: PALETTE.primaryDark,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  periodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  periodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: PALETTE.lightBg,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  periodChipActive: {
    backgroundColor: PALETTE.primaryDark,
    borderColor: PALETTE.secondaryLight,
  },
  periodChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: PALETTE.primaryDark,
  },
  periodChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: PALETTE.lightBg,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  typeBtnActive: {
    backgroundColor: PALETTE.vibrantAccent,
    borderColor: PALETTE.secondaryLight,
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: PALETTE.primaryDark,
  },
  typeBtnTextActive: {
    fontWeight: '800',
    color: PALETTE.primaryDark,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 16,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: PALETTE.secondaryDark,
  },
  confirmBtn: {
    flex: 2,
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: PALETTE.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PALETTE.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmBtnDisabled: {
    opacity: 0.7,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

