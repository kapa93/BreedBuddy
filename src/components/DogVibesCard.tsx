import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDogSpotVibes } from '@/hooks/useDogSpotVibes';
import type { VibeOptionWithCount } from '@/hooks/useDogSpotVibes';
import { colors, radius, spacing, typography } from '@/theme';

type Props = {
  googlePlaceId: string;
};

export function DogVibesCard({ googlePlaceId }: Props) {
  const {
    vibeOptionsWithCounts,
    uniqueVoterCount,
    isLoading,
    error,
    toggleVibe,
    togglingOptionId,
  } = useDogSpotVibes(googlePlaceId);

  const vibesWithVotes = vibeOptionsWithCounts.filter((v) => v.count > 0);

  if (isLoading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingBox}>
        <Text style={styles.errorText}>Couldn't load dog vibes.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {/* ── Approved row ─────────────────────────────────────── */}
      <View style={styles.approvedRow}>
        <Ionicons name="paw" size={16} color={colors.primary} />
        {uniqueVoterCount > 0 ? (
          <Text style={styles.approvedText}>
            Dog Approved by {uniqueVoterCount} {uniqueVoterCount === 1 ? 'local' : 'locals'}
          </Text>
        ) : (
          <Text style={styles.approvedText}>Be the first to add a dog vibe</Text>
        )}
        <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
      </View>
      <Text style={styles.subtitle}>What dog owners love about this place</Text>

      {/* ── Popular vibes (count > 0) ─────────────────────────── */}
      {vibesWithVotes.length > 0 ? (
        <View style={styles.chipRow}>
          {vibesWithVotes.map((vibe) => (
            <VibeChip
              key={vibe.id}
              vibe={vibe}
              isToggling={togglingOptionId === vibe.id}
              onPress={() => toggleVibe(vibe.id)}
            />
          ))}
        </View>
      ) : (
        <Text style={styles.emptyVibes}>No vibes yet — add what applies below.</Text>
      )}

      <View style={styles.separator} />

      {/* ── Add your vibe ────────────────────────────────────── */}
      <Text style={styles.addTitle}>Add your vibe</Text>
      <Text style={styles.addSubtitle}>Tap any that apply 👆</Text>
      <View style={styles.chipRow}>
        {vibeOptionsWithCounts
          .filter((v) => !v.selectedByCurrentUser)
          .map((vibe) => (
            <VibeChip
              key={vibe.id}
              vibe={vibe}
              isToggling={togglingOptionId === vibe.id}
              onPress={() => toggleVibe(vibe.id)}
            />
          ))}
      </View>

      {/* ── Footer ───────────────────────────────────────────── */}
      <View style={styles.footer}>
        <Ionicons name="people-outline" size={15} color={colors.textMuted} />
        <Text style={styles.footerText}>Vibes from local dog owners like you</Text>
      </View>
    </View>
  );
}

// ── Chip ─────────────────────────────────────────────────────────────────────

type ChipProps = {
  vibe: VibeOptionWithCount;
  isToggling: boolean;
  onPress: () => void;
};

function VibeChip({ vibe, isToggling, onPress }: ChipProps) {
  const isSelected = vibe.selectedByCurrentUser;
  const iconName = vibe.icon as React.ComponentProps<typeof Ionicons>['name'] | null;

  return (
    <TouchableOpacity
      style={[styles.chip, isSelected ? styles.chipSelected : styles.chipUnselected]}
      onPress={onPress}
      disabled={isToggling}
      activeOpacity={0.75}
    >
      {isToggling ? (
        <ActivityIndicator size={12} color={isSelected ? colors.primary : colors.primary} />
      ) : iconName ? (
        <Ionicons name={iconName} size={15} color={colors.primary} />
      ) : null}
      <Text style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}>
        {vibe.label}
      </Text>
      {vibe.count > 0 && (
        <Text style={styles.chipCount}>{vibe.count}</Text>
      )}
    </TouchableOpacity>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  errorText: {
    ...typography.bodyMuted,
    textAlign: 'center',
  },

  approvedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  approvedText: {
    ...typography.body,
    color: colors.primary,
    fontFamily: 'Inter_500Medium',
    flex: 1,
    fontSize: 15,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
  },

  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs + 1,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xxs + 2,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  chipSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  chipUnselected: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
  },
  chipLabel: {
    ...typography.caption,
    color: colors.textPrimary,
    fontFamily: 'Inter_500Medium',
  },
  chipLabelSelected: {
    color: colors.primary,
  },
  chipCount: {
    ...typography.caption,
    color: colors.primary,
    fontFamily: 'Inter_700Bold',
  },

  emptyVibes: {
    ...typography.caption,
    color: colors.textMuted,
    fontStyle: 'italic',
  },

  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xxs,
  },
  addTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
  },
  addSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: -spacing.xxs,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  footerText: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
