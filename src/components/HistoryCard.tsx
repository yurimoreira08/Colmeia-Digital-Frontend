import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../theme/ThemeContext';
import { isoDateToDisplay } from '../utils/date';
import type { ReviewReport } from '../types/reviewReport';
import { OPTION_LABELS as REVISION_OPTION_LABELS } from '../types/reviewReport';
import { ActionButtonsBar } from './ActionButtonsBar';
import type { ManejoReport } from '../types/manejo';

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

type ItemType = 'revisao' | 'manejo';

type Props = {
  item: ReviewReport | ManejoReport | any;
  type: ItemType;
  onEdit?: (item: any) => void;
  onArchive?: (item: any) => void;
  onDelete?: (item: any) => void;
  onDownload?: (item: any) => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (item: any) => void;
  onLongPress?: (item: any) => void;
  variant?: 'default' | 'modal';
};

export function HistoryCard({
  item,
  type,
  onEdit,
  onArchive,
  onDelete,
  onDownload,
  selectionMode = false,
  isSelected = false,
  onToggleSelection,
  onLongPress,
  variant = 'default',
}: Props) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors, isSelected, variant);

  const formatCardTitle = () => {
    const dateStr = item.createdAt ? isoDateToDisplay(item.createdAt) : new Date(item.createdAt || '').toLocaleDateString('pt-BR');
    if (type === 'revisao') return `Revisão: ${dateStr}`;
    if (type === 'manejo') return `Manejo: ${dateStr}`;
    return '';
  };

  const handlePressCard = () => {
    if (selectionMode && onToggleSelection) {
      onToggleSelection(item);
    }
  };

  return (
    <Pressable
      style={styles.card}
      onPress={handlePressCard}
      onLongPress={() => {
        if (onLongPress) {
          onLongPress(item);
        }
      }}
      delayLongPress={350}
      disabled={!selectionMode && !onLongPress}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          {selectionMode && onToggleSelection && (
            <View style={styles.checkbox}>
              <Ionicons
                name={isSelected ? 'checkbox' : 'square-outline'}
                size={22}
                color={isSelected ? colors.accent : colors.textMuted}
              />
            </View>
          )}
          <Text style={styles.cardTitle} numberOfLines={1}>
            {formatCardTitle()}
          </Text>
        </View>

        {/* Action Buttons */}
        {!selectionMode && (
          <View style={styles.actionsContainer}>
            {onEdit && (
              <Pressable style={styles.iconBtn} onPress={() => onEdit(item)} hitSlop={8}>
                <Ionicons name="pencil" size={20} color={colors.textPrimary} />
              </Pressable>
            )}
            {onDelete && (
              <Pressable style={styles.iconBtn} onPress={() => onDelete(item)} hitSlop={8}>
                <Ionicons name="trash-outline" size={20} color={colors.error} />
              </Pressable>
            )}
            {(onArchive || onDownload) && (
              <ActionButtonsBar
                onArchive={onArchive ? () => onArchive(item) : () => {}}
                onDownload={onDownload ? () => onDownload(item) : undefined}
                isArchived={!!item.archived}
              />
            )}
          </View>
        )}
      </View>

      {/* Content depending on type */}
      {type === 'revisao' && (
        <>
          {item.checkedOptions && item.checkedOptions.length > 0 && (
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>CONDIÇÕES DA CAIXA</Text>
              <View style={styles.grid}>
                {item.checkedOptions.map((opt: string) => (
                  <View key={opt} style={styles.optionCard}>
                    <Text style={styles.optionText}>{REVISION_OPTION_LABELS[opt] || opt}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </>
      )}

      {type === 'manejo' && (
        <>
          {item.checkedOptions && item.checkedOptions.length > 0 && (
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>TAREFA{item.checkedOptions.length > 1 ? 'S' : ''} REALIZADA{item.checkedOptions.length > 1 ? 'S' : ''}</Text>
              <View style={styles.tasksContainer}>
                {item.checkedOptions.map((task: any, idx: number) => (
                  <View key={`task-${idx}`} style={styles.taskItem}>
                    <Text style={styles.cardDetail}>
                      • {task.id === 'outro' && task.customName ? task.customName : (MANEJO_OPTION_LABELS[task.id] || task.id)}
                    </Text>
                    {task.obs ? <Text style={styles.taskNoteText}>Observações: {task.obs}</Text> : null}
                    {task.ind ? <Text style={styles.taskIndicationText}>O que fazer: {task.ind}</Text> : null}
                  </View>
                ))}
              </View>
            </View>
          )}

          {item.photoUri ? (
            <View style={[styles.detailSection, { marginTop: 10 }]}>
              <Text style={styles.detailLabel}>FOTO DO MANEJO</Text>
              <Image source={{ uri: item.photoUri }} style={styles.manejoCardPhoto} resizeMode="cover" />
            </View>
          ) : null}
        </>
      )}

      {/* Common fields (observacoes / indicacoes) for reports */}
      {item.observacoes ? (
        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>OBSERVAÇÕES</Text>
          <View style={styles.obsBadge}>
            <Text style={styles.obsText}>{item.observacoes}</Text>
          </View>
        </View>
      ) : null}

      {item.indicacoes ? (
        <View style={styles.detailSection}>
          <Text style={styles.detailLabel}>O QUE FAZER</Text>
          <View style={styles.obsBadge}>
            <Text style={styles.obsText}>{item.indicacoes}</Text>
          </View>
        </View>
      ) : null}
    </Pressable>
  );
}

function createStyles(colors: any, isSelected: boolean, variant: 'default' | 'modal') {
  const isModal = variant === 'modal';

  return StyleSheet.create({
    card: {
      borderRadius: isModal ? 12 : 14,
      borderWidth: 1,
      borderColor: isSelected ? colors.accent : colors.cardBorder,
      backgroundColor: isSelected ? colors.accentSoft + '40' : (isModal ? colors.card : colors.surface),
      paddingHorizontal: isModal ? 12 : 14,
      paddingVertical: isModal ? 12 : 12,
      marginBottom: isModal ? 10 : 8,
      borderLeftWidth: isModal ? 4 : (isSelected ? 1.5 : 1),
      borderLeftColor: isModal ? colors.accent : (isSelected ? colors.accent : colors.cardBorder),
      gap: 4,
      flexDirection: 'column',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
      paddingBottom: 6,
      marginBottom: 4,
    },
    titleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    checkbox: {
      marginRight: 8,
    },
    cardTitle: {
      fontSize: 14,
      color: colors.textPrimary,
      fontWeight: '600',
      flex: 1,
    },
    actionsContainer: {
      flexDirection: 'row',
      gap: 10,
      flexWrap: 'wrap',
      justifyContent: 'flex-end',
      maxWidth: '60%',
      alignItems: 'center',
    },
    iconBtn: {
      padding: 4,
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 6,
      paddingHorizontal: 10,
      backgroundColor: colors.accentSoft,
      borderRadius: 8,
    },
    actionBtnText: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: 'bold',
    },
    detailSection: {
      marginTop: 10,
      gap: 4,
    },
    detailLabel: {
      fontSize: 12,
      color: colors.textMuted,
      letterSpacing: 0.8,
      fontWeight: 'bold',
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 10,
      marginBottom: 10,
      marginTop: 6,
    },
    optionCard: {
      width: '48%',
      minHeight: 40,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
      paddingVertical: 8,
    },
    optionText: {
      fontSize: 13,
      textAlign: 'center',
      color: colors.textPrimary,
      fontWeight: '600',
    },
    tasksContainer: {
      gap: 10,
      marginTop: 4,
    },
    taskItem: {
      backgroundColor: colors.card,
      borderRadius: 10,
      padding: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      gap: 4,
    },
    cardDetail: {
      fontSize: 15,
      color: colors.textPrimary,
      lineHeight: 20,
      fontWeight: '500',
    },
    taskNoteText: {
      fontSize: 15,
      color: '#000000',
      fontWeight: 'bold',
      backgroundColor: '#F5F5F5',
      padding: 6,
      borderRadius: 6,
      marginTop: 4,
    },
    taskIndicationText: {
      fontSize: 15,
      color: '#1B5E20',
      fontWeight: 'bold',
      backgroundColor: '#E8F5E9',
      padding: 6,
      borderRadius: 6,
      marginTop: 4,
    },
    manejoCardPhoto: {
      width: '100%',
      height: 160,
      borderRadius: 10,
      marginTop: 6,
    },
    obsBadge: {
      borderRadius: 12,
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    obsText: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.textPrimary,
    },
  });
}
