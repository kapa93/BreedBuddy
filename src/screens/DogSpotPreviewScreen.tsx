import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getGooglePlacePhotoUrl,
  getGooglePlacePreview,
} from '@/api/places';
import { useStackHeaderHeight } from '@/hooks/useStackHeaderHeight';
import { colors, radius, spacing, typography } from '@/theme';

// ── Placeholder vibe data ──────────────────────────────────────────────────────

const PLACEHOLDER_VIBES = [
  { icon: 'water-outline' as const, label: 'Water bowls', count: 8 },
  { icon: 'umbrella-outline' as const, label: 'Dog-friendly patio', count: 6 },
  { icon: 'gift-outline' as const, label: 'Gives treats', count: 4 },
  { icon: 'partly-sunny-outline' as const, label: 'Great after beach', count: 3 },
  { icon: 'people-outline' as const, label: 'Dog-friendly staff', count: 2 },
];

const ADD_VIBES = [
  'Quiet', 'Shady seating', 'Spacious patio',
  'Good for small dogs', 'Good for social dogs',
  'Usually busy', 'Loud', 'Limited parking',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

type ParsedDay = { day: string; hours: string };

const IGNORED_PLACE_TYPES = new Set([
  'establishment', 'point_of_interest', 'food',
  'premise', 'geocode', 'subpremise',
]);

function parseOpeningHours(value: unknown): ParsedDay[] {
  if (!value || typeof value !== 'object') return [];
  const maybe = value as { weekdayDescriptions?: unknown };
  if (!Array.isArray(maybe.weekdayDescriptions)) return [];
  return maybe.weekdayDescriptions
    .filter((l): l is string => typeof l === 'string')
    .map((line) => {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) return { day: line, hours: '' };
      return { day: line.slice(0, colonIdx).trim(), hours: line.slice(colonIdx + 1).trim() };
    });
}

function formatPlaceCategory(placeType: string): string {
  if (placeType === 'dog_park') return 'Dog Park';
  if (placeType === 'dog_beach') return 'Beach';
  if (placeType === 'trail') return 'Trail';
  if (placeType === 'park') return 'Park';
  return 'Other';
}

function formatExtraTypes(types: string[]): string {
  return types
    .filter((t) => !IGNORED_PLACE_TYPES.has(t))
    .slice(0, 2)
    .map((t) => t.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '))
    .join(' • ');
}

function formatRating(rating: number | null, ratingCount: number | null): string {
  if (rating == null) return 'Not available';
  if (ratingCount == null) return `${rating.toFixed(1)}`;
  return `${rating.toFixed(1)} (${ratingCount.toLocaleString()} reviews)`;
}

function todayDayName(): string {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
    new Date().getDay()
  ];
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({
  icon,
  iconColor = colors.textPrimary,
  title,
  rightChevron,
  children,
}: {
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  iconColor?: string;
  title: string;
  rightChevron?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        {icon ? <Ionicons name={icon} size={19} color={iconColor} /> : null}
        <Text style={styles.sectionTitle}>{title}</Text>
        {rightChevron ? (
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        ) : null}
      </View>
      {children}
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

type Props = {
  route: { params: { googlePlaceId: string; initialName?: string } };
  navigation: { setOptions: (opts: object) => void };
};

export function DogSpotPreviewScreen({ route, navigation }: Props) {
  const { googlePlaceId, initialName } = route.params;
  const headerHeight = useStackHeaderHeight();

  const placeQuery = useQuery({
    queryKey: ['googlePlacePreview', googlePlaceId],
    queryFn: () => getGooglePlacePreview(googlePlaceId),
  });

  useEffect(() => {
    navigation.setOptions({ title: placeQuery.data?.displayName ?? initialName ?? 'Place Preview' });
  }, [initialName, navigation, placeQuery.data?.displayName]);

  const place = placeQuery.data;
  const parsedHours = parseOpeningHours(place?.currentOpeningHours);
  const today = todayDayName();
  const leftDays = parsedHours.slice(0, 4);
  const rightDays = parsedHours.slice(4);
  const firstPhotoUrl = place?.photos[0] ? getGooglePlacePhotoUrl(place.photos[0].name) : null;

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: headerHeight + spacing.lg }]}
        showsVerticalScrollIndicator={false}
      >
        {placeQuery.isLoading ? (
          <View style={styles.stateBox}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.stateText}>Loading place preview…</Text>
          </View>
        ) : placeQuery.isError ? (
          <View style={styles.stateBox}>
            <Text style={styles.errorTitle}>Couldn't load place details</Text>
            <Text style={styles.stateText}>
              {placeQuery.error instanceof Error ? placeQuery.error.message : 'Try again in a moment.'}
            </Text>
          </View>
        ) : place ? (
          <>
            {/* ── Hero card ─────────────────────────────────────── */}
            <View style={styles.heroCard}>
              <View>
                {firstPhotoUrl ? (
                  <Image source={{ uri: firstPhotoUrl }} style={styles.heroThumb} />
                ) : (
                  <View style={[styles.heroThumb, styles.heroThumbFallback]}>
                    <Ionicons name="image-outline" size={28} color={colors.textMuted} />
                  </View>
                )}
                {place.photos.length > 0 ? (
                  <View style={styles.photoBadge}>
                    <Ionicons name="camera-outline" size={11} color="#fff" />
                    <Text style={styles.photoBadgeText}>{place.photos.length}</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.heroInfo}>
                <Text style={styles.heroName} numberOfLines={2}>{place.displayName}</Text>
                <View style={styles.heroRow}>
                  <Ionicons name="paw-outline" size={13} color={colors.textMuted} style={styles.heroRowIcon} />
                  <Text style={styles.heroRowText} numberOfLines={1}>
                    {[formatPlaceCategory(place.placeType), formatExtraTypes(place.types)]
                      .filter(Boolean)
                      .join(' • ')}
                  </Text>
                </View>
                {place.shortFormattedAddress ? (
                  <View style={styles.heroRow}>
                    <Ionicons name="location-outline" size={13} color={colors.textMuted} style={styles.heroRowIcon} />
                    <Text style={styles.heroRowText} numberOfLines={2}>
                      {place.shortFormattedAddress}
                    </Text>
                  </View>
                ) : null}
                {place.rating != null ? (
                  <View style={styles.heroRow}>
                    <Ionicons name="star-outline" size={13} color={colors.textMuted} style={styles.heroRowIcon} />
                    <Text style={styles.heroRowText}>
                      {formatRating(place.rating, place.ratingCount)}
                    </Text>
                  </View>
                ) : null}
                {place.openNow != null ? (
                  <View style={styles.heroRow}>
                    <View style={[styles.openDot, !place.openNow && styles.closedDot]} />
                    <Text style={[styles.heroRowText, place.openNow ? styles.openNowText : styles.closedNowText]}>
                      {place.openNow ? 'Open now' : 'Closed'}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* ── Dog Vibes ─────────────────────────────────────── */}
            <Section title="Dog Vibes">
              <View style={styles.vibeApprovedRow}>
                <Ionicons name="paw" size={16} color={colors.primary} />
                <Text style={styles.vibeApprovedText}>Dog Approved by 12 locals</Text>
                <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
              </View>
              <Text style={styles.vibeSubtitle}>What dog owners love about this place</Text>
              <View style={styles.vibeChipRow}>
                {PLACEHOLDER_VIBES.map((vibe) => (
                  <View key={vibe.label} style={styles.vibeChip}>
                    <Ionicons name={vibe.icon} size={15} color={colors.primary} />
                    <Text style={styles.vibeChipLabel}>{vibe.label}</Text>
                    <Text style={styles.vibeChipCount}>{vibe.count}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.vibeSeparator} />
              <Text style={styles.vibeAddTitle}>Add your vibe</Text>
              <Text style={styles.vibeAddSubtitle}>Tap any that apply {'👆'}</Text>
              <View style={styles.vibeChipRow}>
                {ADD_VIBES.map((label) => (
                  <View key={label} style={styles.vibeAddChip}>
                    <Ionicons name="add" size={15} color={colors.primary} />
                    <Text style={styles.vibeAddChipLabel}>{label}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.vibeFooter}>
                <Ionicons name="people-outline" size={15} color={colors.textMuted} />
                <Text style={styles.vibeFooterText}>Vibes from local dog owners like you</Text>
              </View>
            </Section>

            {/* ── Photos ────────────────────────────────────────── */}
            <Section icon="images-outline" title="Photos">
              {place.photos.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.photoStrip}
                >
                  {place.photos.map((photo, index) => (
                    <Image
                      key={photo.name}
                      source={{ uri: getGooglePlacePhotoUrl(photo.name) }}
                      style={styles.photo}
                      accessibilityLabel={`${place.displayName} photo ${index + 1}`}
                    />
                  ))}
                </ScrollView>
              ) : (
                <Text style={styles.emptyValue}>No photos available.</Text>
              )}
            </Section>

            {/* ── Hours ─────────────────────────────────────────── */}
            <Section icon="time-outline" title="Hours">
              {parsedHours.length > 0 ? (
                <View style={styles.hoursGrid}>
                  <View style={styles.hoursColumn}>
                    {leftDays.map(({ day, hours }) => (
                      <View key={day} style={styles.hoursRow}>
                        <Text style={[styles.hoursDay, day === today && styles.hoursDayToday]}>
                          {day}
                        </Text>
                        <Text style={styles.hoursTime}>{hours}</Text>
                      </View>
                    ))}
                  </View>
                  {rightDays.length > 0 ? (
                    <View style={styles.hoursColumn}>
                      {rightDays.map(({ day, hours }) => (
                        <View key={day} style={styles.hoursRow}>
                          <Text style={[styles.hoursDay, day === today && styles.hoursDayToday]}>
                            {day}
                          </Text>
                          <Text style={styles.hoursTime}>{hours}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              ) : (
                <Text style={styles.emptyValue}>Not available.</Text>
              )}
            </Section>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl + 75,
    gap: spacing.lg,
  },

  // ── Loading / error states
  stateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    gap: spacing.sm,
  },
  stateText: {
    ...typography.bodyMuted,
    textAlign: 'center',
  },
  errorTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },

  // ── Hero card
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    flexDirection: 'row',
    gap: spacing.md,
  },
  heroThumb: {
    width: 110,
    height: 110,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
  },
  heroThumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoBadge: {
    position: 'absolute',
    bottom: spacing.xs,
    left: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: radius.xs,
  },
  photoBadgeText: {
    ...typography.caption,
    color: '#fff',
    fontSize: 11,
    lineHeight: 14,
  },
  heroInfo: {
    flex: 1,
    gap: spacing.xxs + 1,
    justifyContent: 'center',
  },
  heroName: {
    ...typography.subtitle,
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xxs + 1,
  },
  heroRowIcon: {
    marginTop: 2,
    flexShrink: 0,
  },
  heroRowText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 17,
  },
  openDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 5,
    flexShrink: 0,
  },
  closedDot: {
    backgroundColor: colors.danger,
  },
  openNowText: {
    color: colors.primary,
  },
  closedNowText: {
    color: colors.danger,
  },

  // ── Section card
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xxs,
  },
  sectionTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    flex: 1,
  },

  // ── Vibe chips (existing)
  vibeApprovedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  vibeApprovedText: {
    ...typography.body,
    color: colors.primary,
    fontFamily: 'Inter_500Medium',
    flex: 1,
    fontSize: 15,
  },
  vibeSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
  },
  vibeChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  vibeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs + 1,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xxs + 2,
    borderRadius: radius.pill,
  },
  vibeChipLabel: {
    ...typography.caption,
    color: colors.primary,
    fontFamily: 'Inter_500Medium',
  },
  vibeChipCount: {
    ...typography.caption,
    color: colors.primary,
    fontFamily: 'Inter_700Bold',
  },
  vibeSeparator: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xxs,
  },
  vibeAddTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
  },
  vibeAddSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: -spacing.xxs,
  },
  vibeAddChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xxs + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  vibeAddChipLabel: {
    ...typography.caption,
    color: colors.textPrimary,
    fontFamily: 'Inter_500Medium',
  },
  vibeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  vibeFooterText: {
    ...typography.caption,
    color: colors.textMuted,
  },

  // ── Photos
  photoStrip: {
    gap: spacing.sm,
    paddingRight: spacing.xxs,
  },
  photo: {
    width: 130,
    height: 120,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
  },

  // ── Hours
  hoursGrid: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  hoursColumn: {
    flex: 1,
    gap: spacing.xs,
  },
  hoursRow: {
    gap: spacing.xxs,
  },
  hoursDay: {
    ...typography.caption,
    color: colors.textPrimary,
    fontFamily: 'Inter_500Medium',
  },
  hoursDayToday: {
    color: colors.primary,
    fontFamily: 'Inter_700Bold',
  },
  hoursTime: {
    ...typography.caption,
    color: colors.primary,
    fontSize: 12,
  },

  emptyValue: {
    ...typography.bodyMuted,
  },
});
