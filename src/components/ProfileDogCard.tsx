import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DogAvatar } from '@/components/DogAvatar';
import { colors, radius, shadow, spacing, typography } from '@/theme';
import type { Dog } from '@/types';
import {
  AGE_GROUP_LABELS,
  BREED_LABELS,
  COMPATIBILITY_ANSWER_LABELS,
  ENERGY_LEVEL_LABELS,
  PLAY_STYLE_LABELS,
} from '@/utils/breed';

type Props = {
  dog: Dog;
  showDetails?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onPress?: () => void;
  footer?: React.ReactNode;
};

function DetailChip({ label }: { label: string }) {
  return (
    <View style={styles.detailChip}>
      <Text style={styles.detailChipText}>{label}</Text>
    </View>
  );
}

export function ProfileDogCard({ dog, showDetails = true, onEdit, onDelete, onPress, footer }: Props) {
  const compatibilityChips = [
    dog.dog_friendliness != null ? `Friendliness ${dog.dog_friendliness}/5` : null,
    dog.play_style ? `Play style: ${PLAY_STYLE_LABELS[dog.play_style]}` : null,
    dog.good_with_puppies ? `Puppies: ${COMPATIBILITY_ANSWER_LABELS[dog.good_with_puppies]}` : null,
    dog.good_with_large_dogs ? `Large dogs: ${COMPATIBILITY_ANSWER_LABELS[dog.good_with_large_dogs]}` : null,
    dog.good_with_small_dogs ? `Small dogs: ${COMPATIBILITY_ANSWER_LABELS[dog.good_with_small_dogs]}` : null,
  ].filter(Boolean) as string[];

  const content = (
    <>
      <View style={styles.headerRow}>
        <View style={styles.identityRow}>
          <DogAvatar imageUrl={dog.dog_image_url} name={dog.name} size={68} roundedSquare />
          <View style={styles.identityText}>
            <Text style={styles.name}>{dog.name}</Text>
            <Text style={styles.breed}>{BREED_LABELS[dog.breed] ?? dog.breed}</Text>
            <Text style={styles.meta}>
              {AGE_GROUP_LABELS[dog.age_group]} · {ENERGY_LEVEL_LABELS[dog.energy_level]} energy
            </Text>
          </View>
        </View>

        {(onEdit || onDelete) ? (
          <View style={styles.actions}>
            {onEdit ? (
              <Pressable onPress={onEdit} style={styles.iconButton} hitSlop={10}>
                <Ionicons name="pencil-outline" size={18} color={colors.primary} />
              </Pressable>
            ) : null}
            {onDelete ? (
              <Pressable onPress={onDelete} style={styles.iconButton} hitSlop={10}>
                <Ionicons name="trash-outline" size={18} color="#DC2626" />
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      {showDetails ? (
        <>
          {compatibilityChips.length > 0 ? (
            <View style={styles.chipRow}>
              {compatibilityChips.map((chip) => (
                <DetailChip key={chip} label={chip} />
              ))}
            </View>
          ) : null}

          {dog.temperament_notes ? (
            <Text style={styles.notes}>{dog.temperament_notes}</Text>
          ) : null}
        </>
      ) : null}

      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </>
  );

  if (!onPress) {
    return <View style={styles.card}>{content}</View>;
  }

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow.sm,
  },
  pressed: {
    opacity: 0.94,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  identityRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  identityText: {
    flex: 1,
    gap: spacing.xxs,
  },
  name: {
    ...typography.subtitle,
  },
  breed: {
    ...typography.body,
  },
  meta: {
    ...typography.caption,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  detailChip: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  detailChipText: {
    ...typography.caption,
    color: colors.primaryDark,
    fontWeight: '700',
  },
  notes: {
    ...typography.bodyMuted,
  },
  footer: {
    gap: spacing.sm,
  },
});
