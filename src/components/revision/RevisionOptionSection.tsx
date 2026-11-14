import React from 'react';
import { Pressable, Text, View } from 'react-native';

import type { BoxReviewStyles } from '../../screens/styles/BoxReviewScreen.styles';
import { PALETTE } from '../../theme/themes';
import type { RevisionOption, RevisionSelection } from '../../utils/revisionOptions';

type Props = {
  sectionId: string;
  title: string;
  options: RevisionOption[];
  selected: RevisionSelection;
  onToggle: (id: string) => void;
  /** Posição da seção e dos itens, para o comando de voz rolar até o item falado. */
  onSectionLayout: (sectionId: string, y: number) => void;
  onItemLayout: (itemId: string, sectionId: string, y: number) => void;
  /** `grid`: cartões em duas colunas. `strength`: pílulas da força do enxame. */
  variant?: 'grid' | 'strength';
  styles: BoxReviewStyles;
};

/** Cor da pílula marcada em cada força do enxame. */
const STRENGTH_ACTIVE_COLOR: Record<string, string> = {
  'forca-fraca': '#DC2626',
  'forca-media': PALETTE.secondaryLight,
  'forca-boa': PALETTE.primaryDark,
};

/** Seção de itens marcáveis da revisão. */
export function RevisionOptionSection({ sectionId, title, options, selected, onToggle, onSectionLayout, onItemLayout, variant = 'grid', styles }: Props) {
  const isStrength = variant === 'strength';
  return (
    <View style={styles.sectionBlock} onLayout={(e) => onSectionLayout(sectionId, e.nativeEvent.layout.y)}>
      <Text style={styles.sectionHeader}>{title}</Text>
      <View style={isStrength ? styles.strengthContainer : styles.grid2Col}>
        {options.map((option) => {
          const active = !!selected[option.id];
          const activeColor = STRENGTH_ACTIVE_COLOR[option.id];
          return (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: active }}
              key={option.id}
              style={
                isStrength
                  ? [styles.strengthPill, active ? { backgroundColor: activeColor, borderColor: activeColor } : null]
                  : [styles.itemCard, active ? styles.itemCardActive : null]
              }
              onPress={() => onToggle(option.id)}
              onLayout={(e) => onItemLayout(option.id, sectionId, e.nativeEvent.layout.y)}
            >
              <Text
                style={
                  isStrength
                    ? [styles.strengthText, active ? { color: '#FFFFFF', fontWeight: '800' } : null]
                    : [styles.itemCardText, active ? styles.itemCardTextActive : null]
                }
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
