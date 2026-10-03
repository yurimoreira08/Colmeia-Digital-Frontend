import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../theme/ThemeContext';
import { isoDateToDisplay } from '../utils/date';
import { OPTION_LABELS as REVISION_OPTION_LABELS } from '../types/reviewReport';

const MANEJO_OPTION_LABELS: Record<string, string> = {
  alimentacao: 'Alimentação',
  divisao: 'Divisão',
  'troca-cera': 'Troca de cera',
  'troca-rainha': 'Troca de rainha',
  'colocacao-sobrecaixa': 'Colocação de sobrecaixa',
  captura: 'Captura',
  'defesa-predadores': 'Defesa contra predadores',
  'reducao-alvado': 'Redução de alvado',
  'numerar-caixas': 'Numerar caixas',
  'ofertar-agua': 'Ofertar água',
  'recolher-caixas-vazias': 'Recolher caixas vazias ou abandonadas',
  'trocar-caixa': 'Caixa trocada',
  outro: 'Outro',
};

type Props = {
  apiaryName: string;
  reports: any[];
  type: 'revisao' | 'manejo';
  onEdit?: (item: any) => void;
  onDelete?: (item: any) => void;
};

const getReportType = (item: any): 'revisao' | 'manejo' => {
  if (Array.isArray(item.checkedOptions) && item.checkedOptions.length > 0) {
    if (typeof item.checkedOptions[0] === 'object' && item.checkedOptions[0] !== null) {
      return 'manejo';
    }
  }
  if (item.photoUri) {
    return 'manejo';
  }
  return 'revisao';
};

function formatParsedDate(rawDate?: string) {
  if (!rawDate) return { day: '--', month: '---', time: '' };
  try {
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) {
      const display = isoDateToDisplay(rawDate);
      const parts = display.split('/');
      return { day: parts[0] || '--', month: parts[1] || '---', time: '' };
    }
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    const month = months[d.getMonth()] || '---';
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const time = `${hours}:${minutes}`;
    return { day, month, time };
  } catch {
    return { day: '--', month: '---', time: '' };
  }
}

export function ReportCard({
  apiaryName,
  reports,
  type,
  onEdit,
  onDelete,
}: Props) {
  const { colors, themeName } = useAppTheme();
  const styles = createStyles(colors, themeName);

  const formattedApiaryName = apiaryName ? apiaryName.toUpperCase() : 'APIÁRIO GERAL';

  return (
    <View style={styles.apiaryGroupCard}>
      {/* 1. Header do Apiário */}
      <View style={styles.apiaryHeader}>
        <View style={styles.apiaryHeaderLeft}>
          <View style={styles.apiaryIconCircle}>
            <Ionicons name="location" size={15} color={colors.accent} />
          </View>
          <Text style={styles.apiaryTitle} numberOfLines={1}>
            {formattedApiaryName}
          </Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>
            {reports.length} {reports.length === 1 ? 'registro' : 'registros'}
          </Text>
        </View>
      </View>

      {/* 2. Lista de Atividades do Apiário */}
      <View style={styles.reportsList}>
        {reports.map((item, index) => {
          const itemType = getReportType(item);
          const isRevisao = itemType === 'revisao';
          const { day, month, time } = formatParsedDate(item.createdAt);

          return (
            <View 
              key={item.id || index} 
              style={[
                styles.activityCard, 
                isRevisao ? styles.activityCardRevisao : styles.activityCardManejo
              ]}
            >
              {/* Faixa Lateral de Destaque */}
              <View style={[styles.sideAccentBar, isRevisao ? styles.sideBarRevisao : styles.sideBarManejo]} />

              <View style={styles.cardInner}>
                {/* Header Superior: Data + Caixa + Tipo + Botões de Ação */}
                <View style={styles.activityHeader}>
                  {/* Data & Hora Capsule */}
                  <View style={[styles.dateCapsule, isRevisao ? styles.dateCapsuleRevisao : styles.dateCapsuleManejo]}>
                    <Text style={styles.dateDay}>{day}</Text>
                    <Text style={styles.dateMonth}>{month}</Text>
                  </View>

                  {/* Informações da Caixa */}
                  <View style={styles.boxInfoWrap}>
                    <View style={styles.boxTitleRow}>
                      <View style={styles.boxNameContainer}>
                        <Ionicons name="cube-outline" size={16} color={colors.textPrimary} />
                        <Text style={styles.boxNameText} numberOfLines={1}>
                          {item.caixaName || 'Caixa'}
                        </Text>
                      </View>
                      <View style={[styles.typePill, isRevisao ? styles.typePillRevisao : styles.typePillManejo]}>
                        <Ionicons
                          name={isRevisao ? 'clipboard-outline' : 'construct-outline'}
                          size={11}
                          color={isRevisao ? '#059669' : '#D97706'}
                        />
                        <Text style={[styles.typePillText, isRevisao ? styles.typePillTextRevisao : styles.typePillTextManejo]}>
                          {isRevisao ? 'REVISÃO' : 'MANEJO'}
                        </Text>
                      </View>
                    </View>
                    {time ? (
                      <View style={styles.timeRow}>
                        <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                        <Text style={styles.timeText}>{time}</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Apenas Botões Editar e Excluir */}
                  <View style={styles.actionButtonsRow}>
                    {onEdit && (
                      <Pressable
                        style={styles.actionCircleBtn}
                        onPress={() => onEdit(item)}
                        hitSlop={8}
                        accessibilityLabel="Editar registro"
                      >
                        <Ionicons name="pencil" size={15} color={colors.accent} />
                      </Pressable>
                    )}
                    {onDelete && (
                      <Pressable
                        style={[styles.actionCircleBtn, styles.actionCircleBtnDelete]}
                        onPress={() => onDelete(item)}
                        hitSlop={8}
                        accessibilityLabel="Excluir registro"
                      >
                        <Ionicons name="trash-outline" size={15} color="#EF4444" />
                      </Pressable>
                    )}
                  </View>
                </View>

                {/* Conteúdo Principal do Card */}
                <View style={styles.activityBody}>
                  {/* Revisão: Condições Identificadas */}
                  {isRevisao && item.checkedOptions && item.checkedOptions.length > 0 && (
                    <View style={styles.sectionBlock}>
                      <View style={styles.sectionHeaderRow}>
                        <Ionicons name="checkmark-circle-outline" size={14} color="#059669" />
                        <Text style={styles.sectionHeading}>CONDIÇÕES IDENTIFICADAS</Text>
                      </View>
                      <View style={styles.tagsGrid}>
                        {item.checkedOptions.map((opt: any) => {
                          const optionKey = typeof opt === 'object' && opt !== null ? (opt.id || opt.name || '') : opt;
                          const label = REVISION_OPTION_LABELS[optionKey] || optionKey || 'Opção';
                          return (
                            <View key={optionKey} style={styles.conditionTag}>
                              <Ionicons name="checkmark" size={12} color="#059669" />
                              <Text style={styles.conditionTagText}>{String(label)}</Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  )}

                  {/* Manejo: Tarefas Realizadas */}
                  {!isRevisao && item.checkedOptions && item.checkedOptions.length > 0 && (
                    <View style={styles.sectionBlock}>
                      <View style={styles.sectionHeaderRow}>
                        <Ionicons name="hammer-outline" size={14} color="#D97706" />
                        <Text style={[styles.sectionHeading, { color: '#D97706' }]}>TAREFAS REALIZADAS</Text>
                      </View>
                      <View style={styles.tasksListWrap}>
                        {item.checkedOptions.map((task: any, idx: number) => (
                          <View key={`task-${idx}`} style={styles.taskItemCard}>
                            <View style={styles.taskItemHeader}>
                              <View style={styles.taskAmberDot} />
                              <Text style={styles.taskItemTitle}>
                                {task.id === 'outro' && task.customName
                                  ? task.customName
                                  : (MANEJO_OPTION_LABELS[task.id] || task.id)}
                              </Text>
                            </View>
                            {task.obs ? (
                              <View style={styles.taskDetailBlock}>
                                <Text style={styles.taskDetailLabel}>Observação:</Text>
                                <Text style={styles.taskDetailText}>{task.obs}</Text>
                              </View>
                            ) : null}
                            {task.ind ? (
                              <View style={[styles.taskDetailBlock, styles.taskActionBlock]}>
                                <Text style={[styles.taskDetailLabel, { color: '#D97706' }]}>O que fazer:</Text>
                                <Text style={[styles.taskDetailText, { color: colors.textPrimary }]}>{task.ind}</Text>
                              </View>
                            ) : null}
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Foto do Manejo */}
                  {!isRevisao && item.photoUri ? (
                    <View style={styles.sectionBlock}>
                      <View style={styles.photoContainer}>
                        <Image source={{ uri: item.photoUri }} style={styles.manejoPhoto} resizeMode="cover" />
                        <View style={styles.photoOverlayBadge}>
                          <Ionicons name="camera" size={13} color="#FFFFFF" />
                          <Text style={styles.photoOverlayText}>Foto do Manejo</Text>
                        </View>
                      </View>
                    </View>
                  ) : null}

                  {/* Observações Gerais */}
                  {item.observacoes ? (
                    <View style={styles.obsCallout}>
                      <View style={styles.calloutHeader}>
                        <Ionicons name="document-text-outline" size={15} color="#059669" />
                        <Text style={styles.obsCalloutLabel}>Observações Gerais</Text>
                      </View>
                      <Text style={styles.obsCalloutText}>{item.observacoes}</Text>
                    </View>
                  ) : null}

                  {/* Recomendações / O Que Fazer */}
                  {item.indicacoes ? (
                    <View style={styles.actionCallout}>
                      <View style={styles.calloutHeader}>
                        <Ionicons name="bulb-outline" size={15} color="#D97706" />
                        <Text style={styles.actionCalloutLabel}>O Que Fazer / Recomendações</Text>
                      </View>
                      <Text style={styles.actionCalloutText}>{item.indicacoes}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(colors: any, themeName: string) {
  const isDark = themeName === 'obsidian-dark';

  return StyleSheet.create({
    apiaryGroupCard: {
      backgroundColor: colors.card,
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: colors.cardBorder,
      marginBottom: 18,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.25 : 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    apiaryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    apiaryHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
      marginRight: 10,
    },
    apiaryIconCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    apiaryTitle: {
      flex: 1,
      fontSize: 14,
      fontWeight: '800',
      color: colors.textPrimary,
      letterSpacing: 0.5,
    },
    countBadge: {
      backgroundColor: colors.accentSoft,
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    countBadgeText: {
      color: colors.accent,
      fontSize: 11.5,
      fontWeight: '700',
    },
    reportsList: {
      padding: 12,
      gap: 12,
    },
    activityCard: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      position: 'relative',
      overflow: 'hidden',
    },
    activityCardRevisao: {
      borderLeftWidth: 0,
    },
    activityCardManejo: {
      borderLeftWidth: 0,
    },
    sideAccentBar: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 4,
      zIndex: 2,
    },
    sideBarRevisao: {
      backgroundColor: '#059669',
    },
    sideBarManejo: {
      backgroundColor: '#D97706',
    },
    cardInner: {
      padding: 14,
      paddingLeft: 18,
      gap: 12,
    },
    activityHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    dateCapsule: {
      width: 44,
      height: 46,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dateCapsuleRevisao: {
      backgroundColor: '#059669',
    },
    dateCapsuleManejo: {
      backgroundColor: '#D97706',
    },
    dateDay: {
      fontSize: 16,
      fontWeight: '900',
      color: '#FFFFFF',
      lineHeight: 18,
    },
    dateMonth: {
      fontSize: 10,
      fontWeight: '800',
      color: 'rgba(255, 255, 255, 0.9)',
      letterSpacing: 0.5,
    },
    boxInfoWrap: {
      flex: 1,
      gap: 3,
    },
    boxTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexWrap: 'wrap',
    },
    boxNameContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    boxNameText: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    typePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    typePillRevisao: {
      backgroundColor: isDark ? 'rgba(5, 150, 105, 0.2)' : '#ECFDF5',
      borderWidth: 1,
      borderColor: '#A7F3D0',
    },
    typePillManejo: {
      backgroundColor: isDark ? 'rgba(217, 119, 6, 0.2)' : '#FEF3C7',
      borderWidth: 1,
      borderColor: '#FDE68A',
    },
    typePillText: {
      fontSize: 10.5,
      fontWeight: '800',
      letterSpacing: 0.4,
    },
    typePillTextRevisao: {
      color: isDark ? '#34D399' : '#059669',
    },
    typePillTextManejo: {
      color: isDark ? '#FBBF24' : '#D97706',
    },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    timeText: {
      fontSize: 11.5,
      color: colors.textMuted,
      fontWeight: '600',
    },
    actionButtonsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    actionCircleBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionCircleBtnDelete: {
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
      borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FECACA',
    },
    activityBody: {
      gap: 10,
    },
    sectionBlock: {
      gap: 6,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    sectionHeading: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.textMuted,
      letterSpacing: 0.5,
    },
    tagsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    conditionTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
    },
    conditionTagText: {
      fontSize: 12.5,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    tasksListWrap: {
      gap: 6,
    },
    taskItemCard: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : colors.card,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 10,
      gap: 5,
    },
    taskItemHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    taskAmberDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#D97706',
    },
    taskItemTitle: {
      fontSize: 13.5,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    taskDetailBlock: {
      marginLeft: 12,
      borderLeftWidth: 2,
      borderLeftColor: colors.cardBorder,
      paddingLeft: 8,
      gap: 1,
    },
    taskActionBlock: {
      borderLeftColor: '#F59E0B',
      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.08)' : '#FFFBEB',
      paddingVertical: 3,
      borderRadius: 4,
    },
    taskDetailLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textMuted,
    },
    taskDetailText: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textPrimary,
      lineHeight: 18,
    },
    photoContainer: {
      position: 'relative',
      borderRadius: 10,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    manejoPhoto: {
      width: '100%',
      height: 180,
      backgroundColor: colors.card,
    },
    photoOverlayBadge: {
      position: 'absolute',
      bottom: 8,
      left: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    photoOverlayText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '700',
    },
    obsCallout: {
      backgroundColor: isDark ? 'rgba(5, 150, 105, 0.1)' : '#ECFDF5',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(5, 150, 105, 0.25)' : '#A7F3D0',
      borderRadius: 10,
      padding: 10,
      gap: 4,
    },
    calloutHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    obsCalloutLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: isDark ? '#34D399' : '#065F46',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    obsCalloutText: {
      fontSize: 13,
      fontWeight: '500',
      color: isDark ? '#A7F3D0' : '#065F46',
      lineHeight: 19,
    },
    actionCallout: {
      backgroundColor: isDark ? 'rgba(217, 119, 6, 0.1)' : '#FFFBEB',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(217, 119, 6, 0.25)' : '#FDE68A',
      borderRadius: 10,
      padding: 10,
      gap: 4,
    },
    actionCalloutLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: isDark ? '#FBBF24' : '#92400E',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    actionCalloutText: {
      fontSize: 13,
      fontWeight: '500',
      color: isDark ? '#FDE68A' : '#92400E',
      lineHeight: 19,
    },
  });
}
