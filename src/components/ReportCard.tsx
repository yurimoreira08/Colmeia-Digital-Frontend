import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../theme/ThemeContext';
import { PALETTE } from '../theme/themes';
import { isoDateToDisplay } from '../utils/date';
import { OPTION_LABELS as REVISION_OPTION_LABELS } from '../types/reviewReport';
import { exportSingleReportPdf, normalizeReportItem } from '../services/pdfExportService';

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
  onExportPdf?: (item: any, type: 'revisao' | 'manejo') => void;
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
  onExportPdf,
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
            <MaterialCommunityIcons name="map-marker" size={16} color={PALETTE.primaryDark} />
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
        {reports.map((rawItem, index) => {
          const item = normalizeReportItem(rawItem);
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
                        <MaterialCommunityIcons name="cube-outline" size={17} color={PALETTE.primaryDark} />
                        <Text style={styles.boxNameText} numberOfLines={1}>
                          {item.caixaName || 'Caixa'}
                        </Text>
                      </View>
                      <View style={[styles.typePill, isRevisao ? styles.typePillRevisao : styles.typePillManejo]}>
                        <MaterialCommunityIcons
                          name={isRevisao ? 'clipboard-text-outline' : 'tools'}
                          size={12}
                          color={isRevisao ? PALETTE.primaryDark : PALETTE.secondaryLight}
                        />
                        <Text style={[styles.typePillText, isRevisao ? styles.typePillTextRevisao : styles.typePillTextManejo]}>
                          {isRevisao ? 'REVISÃO' : 'MANEJO'}
                        </Text>
                      </View>
                    </View>
                    {time ? (
                      <View style={styles.timeRow}>
                        <MaterialCommunityIcons name="clock-outline" size={13} color={PALETTE.secondaryDark} />
                        <Text style={styles.timeText}>{time}</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Botões de Ação: PDF, Editar e Excluir */}
                  <View style={styles.actionButtonsRow}>
                    <Pressable
                      style={[styles.actionCircleBtn, styles.actionCircleBtnPdf]}
                      onPress={() => {
                        if (onExportPdf) {
                          onExportPdf(item, itemType);
                        } else {
                          void exportSingleReportPdf(item, itemType);
                        }
                      }}
                      hitSlop={8}
                      accessibilityLabel="Baixar anotação em PDF"
                    >
                      <MaterialCommunityIcons name="file-pdf-box" size={19} color="#DC2626" />
                    </Pressable>

                    {onEdit && (
                      <Pressable
                        style={styles.actionCircleBtn}
                        onPress={() => onEdit(item)}
                        hitSlop={8}
                        accessibilityLabel="Editar registro"
                      >
                        <MaterialCommunityIcons name="pencil-outline" size={17} color={PALETTE.secondaryDark} />
                      </Pressable>
                    )}
                    {onDelete && (
                      <Pressable
                        style={[styles.actionCircleBtn, styles.actionCircleBtnDelete]}
                        onPress={() => onDelete(item)}
                        hitSlop={8}
                        accessibilityLabel="Excluir registro"
                      >
                        <MaterialCommunityIcons name="trash-can-outline" size={17} color={PALETTE.danger} />
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
                        <MaterialCommunityIcons name="check-circle-outline" size={15} color={PALETTE.primaryDark} />
                        <Text style={styles.sectionHeading}>CONDIÇÕES IDENTIFICADAS</Text>
                      </View>
                      <View style={styles.tagsGrid}>
                        {item.checkedOptions.map((opt: any) => {
                          const optionKey = typeof opt === 'object' && opt !== null ? (opt.id || opt.name || '') : opt;
                          const label = REVISION_OPTION_LABELS[optionKey] || optionKey || 'Opção';
                          return (
                            <View key={optionKey} style={styles.conditionTag}>
                              <MaterialCommunityIcons name="check" size={13} color={PALETTE.primaryDark} />
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
                        <MaterialCommunityIcons name="tools" size={15} color={PALETTE.secondaryLight} />
                        <Text style={[styles.sectionHeading, { color: PALETTE.secondaryLight }]}>TAREFAS REALIZADAS</Text>
                      </View>
                      <View style={styles.tasksListWrap}>
                        {item.checkedOptions.map((task: any, idx: number) => (
                          <View key={`task-${idx}`} style={styles.taskItemCard}>
                            <View style={styles.taskItemHeader}>
                              <View style={styles.taskAmberDot} />
                              <Text style={styles.taskItemTitle}>
                                {task.id === 'outro' && task.customName
                                  ? task.customName
                                  : (MANEJO_OPTION_LABELS[task.id] || task.customName || task.id)}
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
                                <Text style={[styles.taskDetailLabel, { color: PALETTE.secondaryLight }]}>O que fazer:</Text>
                                <Text style={[styles.taskDetailText, { color: PALETTE.primaryDark }]}>{task.ind}</Text>
                              </View>
                            ) : null}
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Foto Anexada (Manejo ou Revisão) */}
                  {item.photoUri ? (
                    <View style={styles.sectionBlock}>
                      <View style={styles.photoContainer}>
                        <Image source={{ uri: item.photoUri }} style={styles.manejoPhoto} resizeMode="cover" />
                        <View style={styles.photoOverlayBadge}>
                          <MaterialCommunityIcons name="camera" size={14} color="#FFFFFF" />
                          <Text style={styles.photoOverlayText}>Foto Anexada</Text>
                        </View>
                      </View>
                    </View>
                  ) : null}

                  {/* Observações Gerais */}
                  {item.observacoes ? (
                    <View style={styles.obsCallout}>
                      <View style={styles.calloutHeader}>
                        <MaterialCommunityIcons name="file-document-outline" size={16} color={PALETTE.primaryDark} />
                        <Text style={styles.obsCalloutLabel}>Observações Gerais</Text>
                      </View>
                      <Text style={styles.obsCalloutText}>{item.observacoes}</Text>
                    </View>
                  ) : null}

                  {/* Recomendações / O Que Fazer */}
                  {item.indicacoes ? (
                    <View style={styles.actionCallout}>
                      <View style={styles.calloutHeader}>
                        <MaterialCommunityIcons name="lightbulb-outline" size={16} color={PALETTE.primaryDark} />
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
      backgroundColor: '#FFFFFF',
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: PALETTE.secondaryLight,
      marginBottom: 18,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    apiaryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: PALETTE.lightSurface,
      borderBottomWidth: 1,
      borderBottomColor: PALETTE.secondaryLight,
    },
    apiaryHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
      marginRight: 10,
    },
    apiaryIconCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    apiaryTitle: {
      flex: 1,
      fontSize: 15,
      fontWeight: '800',
      color: PALETTE.primaryDark,
      letterSpacing: 0.5,
    },
    countBadge: {
      backgroundColor: PALETTE.secondaryLight,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
    },
    countBadgeText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
    },
    reportsList: {
      padding: 12,
      gap: 12,
    },
    activityCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: PALETTE.lightSurface,
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
      width: 5,
      zIndex: 2,
    },
    sideBarRevisao: {
      backgroundColor: PALETTE.primaryDark,
    },
    sideBarManejo: {
      backgroundColor: PALETTE.secondaryLight,
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
      width: 46,
      height: 48,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dateCapsuleRevisao: {
      backgroundColor: PALETTE.primaryDark,
    },
    dateCapsuleManejo: {
      backgroundColor: PALETTE.secondaryLight,
    },
    dateDay: {
      fontSize: 17,
      fontWeight: '900',
      color: '#FFFFFF',
      lineHeight: 19,
    },
    dateMonth: {
      fontSize: 10.5,
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
      gap: 5,
    },
    boxNameText: {
      fontSize: 16,
      fontWeight: '800',
      color: PALETTE.primaryDark,
    },
    typePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
    },
    typePillRevisao: {
      backgroundColor: PALETTE.lightSurface,
      borderWidth: 1,
      borderColor: PALETTE.secondaryLight,
    },
    typePillManejo: {
      backgroundColor: PALETTE.lightSurface,
      borderWidth: 1,
      borderColor: PALETTE.secondaryDark,
    },
    typePillText: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.4,
    },
    typePillTextRevisao: {
      color: PALETTE.primaryDark,
    },
    typePillTextManejo: {
      color: PALETTE.secondaryLight,
    },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    timeText: {
      fontSize: 12,
      color: PALETTE.secondaryDark,
      fontWeight: '600',
    },
    actionButtonsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    actionCircleBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: PALETTE.lightSurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionCircleBtnDelete: {
      backgroundColor: '#FEE2E2',
    },
    actionCircleBtnPdf: {
      backgroundColor: '#FEF2F2',
      borderWidth: 1,
      borderColor: '#FCA5A5',
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
      gap: 6,
    },
    sectionHeading: {
      fontSize: 12,
      fontWeight: '800',
      color: PALETTE.primaryDark,
      letterSpacing: 0.6,
    },
    tagsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    conditionTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      backgroundColor: PALETTE.lightSurface,
      borderWidth: 1,
      borderColor: PALETTE.secondaryLight,
    },
    conditionTagText: {
      fontSize: 13,
      fontWeight: '700',
      color: PALETTE.primaryDark,
    },
    tasksListWrap: {
      gap: 8,
    },
    taskItemCard: {
      backgroundColor: PALETTE.lightSurface,
      borderRadius: 10,
      padding: 10,
      gap: 6,
    },
    taskItemHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    taskAmberDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: PALETTE.secondaryLight,
    },
    taskItemTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: PALETTE.primaryDark,
    },
    taskDetailBlock: {
      marginLeft: 14,
      borderLeftWidth: 2,
      borderLeftColor: PALETTE.secondaryDark,
      paddingLeft: 8,
      gap: 2,
    },
    taskActionBlock: {
      borderLeftColor: PALETTE.secondaryLight,
      backgroundColor: '#FFFFFF',
      paddingVertical: 4,
      paddingHorizontal: 6,
      borderRadius: 6,
    },
    taskDetailLabel: {
      fontSize: 11.5,
      fontWeight: '700',
      color: PALETTE.secondaryDark,
    },
    taskDetailText: {
      fontSize: 13.5,
      fontWeight: '600',
      color: PALETTE.primaryDark,
      lineHeight: 19,
    },
    photoContainer: {
      position: 'relative',
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: PALETTE.secondaryLight,
    },
    manejoPhoto: {
      width: '100%',
      height: 190,
      backgroundColor: PALETTE.lightSurface,
    },
    photoOverlayBadge: {
      position: 'absolute',
      bottom: 8,
      left: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: 'rgba(44, 66, 81, 0.85)',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
    },
    photoOverlayText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
    },
    obsCallout: {
      backgroundColor: PALETTE.lightSurface,
      borderWidth: 1,
      borderColor: PALETTE.secondaryLight,
      borderRadius: 12,
      padding: 12,
      gap: 4,
    },
    calloutHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    obsCalloutLabel: {
      fontSize: 11.5,
      fontWeight: '800',
      color: PALETTE.primaryDark,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    obsCalloutText: {
      fontSize: 13.5,
      fontWeight: '500',
      color: PALETTE.primaryDark,
      lineHeight: 20,
    },
    actionCallout: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1.5,
      borderColor: PALETTE.secondaryLight,
      borderRadius: 12,
      padding: 12,
      gap: 4,
    },
    actionCalloutLabel: {
      fontSize: 11.5,
      fontWeight: '800',
      color: PALETTE.primaryDark,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    actionCalloutText: {
      fontSize: 13.5,
      fontWeight: '500',
      color: PALETTE.primaryDark,
      lineHeight: 20,
    },
  });
}
