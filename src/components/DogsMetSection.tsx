import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { DogAvatar } from '@/components/DogAvatar';
import { useDogsMetByDog } from '@/hooks/useDogsMetByDog';
import { colors, radius, spacing, typography } from '@/theme';
import { BREED_LABELS, formatRelativeTime } from '@/utils/breed';

type Props = {
  dogId: string;
  onOpenDogProfile?: (dogId: string) => void;
  title?: string;
  emptyLabel?: string;
};

export function DogsMetSection({
  dogId,
  onOpenDogProfile,
  title = 'Dogs Met',
  emptyLabel = 'No dogs met yet',
}: Props) {
  const { data: dogsMet = [], isLoading } = useDogsMetByDog(dogId);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      {isLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>Loading dogs met...</Text>
        </View>
      ) : dogsMet.length === 0 ? (
        <Text style={styles.emptyText}>{emptyLabel}</Text>
      ) : (
        <View style={styles.list}>
          {dogsMet.map((dog) => (
            <Pressable
              key={dog.id}
              onPress={onOpenDogProfile ? () => onOpenDogProfile(dog.id) : undefined}
              style={({ pressed }) => [styles.row, pressed && onOpenDogProfile ? styles.pressed : null]}
            >
              <DogAvatar imageUrl={dog.dog_image_url} name={dog.name} size={44} roundedSquare />

              <View style={styles.textWrap}>
                <Text style={styles.name}>{dog.name}</Text>
                <Text style={styles.breed}>{BREED_LABELS[dog.breed] ?? dog.breed}</Text>
                <Text style={styles.meta}>
                  {dog.interaction_count === 1 ? 'Met once' : `Met ${dog.interaction_count} times`} ·{' '}
                  {formatRelativeTime(dog.latest_interaction_at)}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  title: {
    ...typography.body,
    fontWeight: '700',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.bodyMuted,
  },
  emptyText: {
    ...typography.bodyMuted,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  pressed: {
    opacity: 0.9,
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...typography.body,
    fontWeight: '700',
  },
  breed: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  meta: {
    ...typography.caption,
  },
});
