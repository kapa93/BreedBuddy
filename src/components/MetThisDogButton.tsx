import React from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import { useDogInteractionMutation } from '@/hooks/useDogInteractionMutation';
import { colors, radius, spacing, typography } from '@/theme';
import type { Dog, DogInteractionSourceType } from '@/types';

type Props = {
  viewerUserId?: string | null;
  viewerDogs: Dog[];
  targetDog: Pick<Dog, 'id' | 'name'>;
  sourceType?: DogInteractionSourceType;
  locationName?: string | null;
  compact?: boolean;
};

export function MetThisDogButton({
  viewerUserId,
  viewerDogs,
  targetDog,
  sourceType = 'manual',
  locationName = null,
  compact = false,
}: Props) {
  const mutation = useDogInteractionMutation();

  const availableViewerDogs = viewerDogs.filter((dog) => dog.id !== targetDog.id);
  const allDogsLabel = availableViewerDogs.length === 2 ? 'Both dogs' : 'All my dogs';

  const handleCreate = (dogIds: string[]) => {
    if (!viewerUserId) {
      Alert.alert('Sign in required', 'Please sign in before tracking dogs met.');
      return;
    }

    mutation.mutate({
      dogIds,
      metDogId: targetDog.id,
      createdByUserId: viewerUserId,
      sourceType,
      locationName,
    });
  };

  const handlePress = () => {
    if (availableViewerDogs.length === 0) {
      Alert.alert('No dog profile', 'Add a dog profile before tracking dogs met.');
      return;
    }

    if (availableViewerDogs.length === 1) {
      handleCreate([availableViewerDogs[0].id]);
      return;
    }

    Alert.alert(
      'Which of your dogs?',
      `Which of your dogs met ${targetDog.name}?`,
      [
        {
          text: allDogsLabel,
          onPress: () => handleCreate(availableViewerDogs.map((dog) => dog.id)),
        },
        ...availableViewerDogs.map((dog) => ({
          text: dog.name,
          onPress: () => handleCreate([dog.id]),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ]
    );
  };

  if (!viewerUserId || viewerDogs.some((dog) => dog.id === targetDog.id)) {
    return null;
  }

  return (
    <Pressable
      onPress={mutation.isPending ? undefined : handlePress}
      style={({ pressed }) => [
        compact ? styles.compactButton : styles.button,
        pressed && styles.pressed,
        mutation.isPending && styles.disabled,
      ]}
    >
      <Text style={compact ? styles.compactText : styles.text}>
        {mutation.isPending ? 'Saving...' : 'Met this dog'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'flex-start',
    minHeight: 42,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  compactButton: {
    alignSelf: 'flex-start',
    minHeight: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  text: {
    ...typography.body,
    color: colors.primaryDark,
    fontWeight: '700',
  },
  compactText: {
    ...typography.caption,
    color: colors.primaryDark,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.6,
  },
});
