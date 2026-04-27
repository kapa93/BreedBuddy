import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getGooglePlacePhotoUrl,
  getGooglePlacePreview,
  importGooglePlace,
} from '@/api/places';
import { supabase } from '@/lib/supabase';
import { useStackHeaderHeight } from '@/hooks/useStackHeaderHeight';
import { colors, radius, shadow, spacing, typography } from '@/theme';

type Props = {
  route: { params: { googlePlaceId: string; initialName?: string } };
  navigation: {
    navigate: (screen: string, params?: object) => void;
    setOptions: (opts: object) => void;
  };
};

export function GooglePlacePreviewScreen({ route, navigation }: Props) {
  const { googlePlaceId, initialName } = route.params;
  const headerHeight = useStackHeaderHeight();
  const queryClient = useQueryClient();

  const placeQuery = useQuery({
    queryKey: ['googlePlacePreview', googlePlaceId],
    queryFn: () => getGooglePlacePreview(googlePlaceId),
  });

  const sessionQuery = useQuery({
    queryKey: ['googlePlacePhotoSession'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
    enabled: (placeQuery.data?.photos.length ?? 0) > 0,
    staleTime: 60_000,
  });

  const importMutation = useMutation({
    mutationFn: importGooglePlace,
    onSuccess: async (place) => {
      await queryClient.invalidateQueries({ queryKey: ['places'] });
      navigation.navigate('PlaceDetail', { placeId: place.id });
    },
  });

  useEffect(() => {
    navigation.setOptions({ title: placeQuery.data?.displayName ?? initialName ?? 'Place Preview' });
  }, [initialName, navigation, placeQuery.data?.displayName]);

  const photoAccessToken = sessionQuery.data?.access_token;

  const hoursLines = formatOpeningHours(placeQuery.data?.currentOpeningHours);

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
            <Text style={styles.errorTitle}>Couldn’t load place details</Text>
            <Text style={styles.stateText}>
              {placeQuery.error instanceof Error ? placeQuery.error.message : 'Try again in a moment.'}
            </Text>
          </View>
        ) : placeQuery.data ? (
          <>
            <View style={styles.heroCard}>
              <Text style={styles.title}>{placeQuery.data.displayName}</Text>
              <InfoRow
                icon="paw-outline"
                label="Category"
                value={formatPlaceCategory(placeQuery.data.placeType)}
              />
              <InfoRow
                icon="location-outline"
                label="Address"
                value={placeQuery.data.shortFormattedAddress ?? 'Not available'}
              />
              <InfoRow
                icon="star-outline"
                label="Rating"
                value={formatRating(placeQuery.data.rating, placeQuery.data.ratingCount)}
              />
              {placeQuery.data.openNow != null ? (
                <InfoRow
                  icon="time-outline"
                  label="Status"
                  value={placeQuery.data.openNow ? 'Open now' : 'Closed right now'}
                />
              ) : null}
            </View>

            <Section title="Photos">
              {placeQuery.data.photos.length > 0 && photoAccessToken ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.photoStrip}
                >
                  {placeQuery.data.photos.map((photo, index) => (
                    <Image
                      key={photo.name}
                      source={{
                        uri: getGooglePlacePhotoUrl(photo.name, photoAccessToken),
                      }}
                      style={styles.photo}
                      accessibilityLabel={`${placeQuery.data?.displayName ?? 'Place'} photo ${index + 1}`}
                    />
                  ))}
                </ScrollView>
              ) : (
                <Text style={styles.emptyValue}>No photos returned.</Text>
              )}
            </Section>

            <Section title="Hours">
              {hoursLines.length > 0 ? (
                hoursLines.map((line) => (
                  <Text key={line} style={styles.valueText}>
                    {line}
                  </Text>
                ))
              ) : (
                <Text style={styles.emptyValue}>Not available.</Text>
              )}
            </Section>

            {importMutation.isError ? (
              <Text style={styles.errorText}>
                {importMutation.error instanceof Error
                  ? importMutation.error.message
                  : 'Couldn’t save this place.'}
              </Text>
            ) : null}

            <Pressable
              onPress={() => importMutation.mutate(googlePlaceId)}
              disabled={importMutation.isPending}
              style={({ pressed }) => [
                styles.addButton,
                pressed && !importMutation.isPending && styles.addButtonPressed,
                importMutation.isPending && styles.addButtonDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Save place"
            >
              {importMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.surface} />
              ) : (
                <Ionicons name="bookmark" size={18} color={colors.surface} />
              )}
              <Text style={styles.addButtonText}>
                {importMutation.isPending ? 'Saving…' : 'Save'}
              </Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={17} color={colors.textMuted} />
      <View style={styles.infoBody}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function formatOpeningHours(value: unknown): string[] {
  if (!value || typeof value !== 'object') return [];
  const maybeHours = value as { weekdayDescriptions?: unknown; openNow?: unknown };
  if (Array.isArray(maybeHours.weekdayDescriptions)) {
    return maybeHours.weekdayDescriptions.filter((line): line is string => typeof line === 'string');
  }
  if (typeof maybeHours.openNow === 'boolean') {
    return [`openNow: ${maybeHours.openNow ? 'true' : 'false'}`];
  }
  return [JSON.stringify(value, null, 2)];
}

function formatPlaceCategory(placeType: string): string {
  if (placeType === 'dog_park') return 'Dog Park';
  if (placeType === 'dog_beach') return 'Beach';
  if (placeType === 'trail') return 'Hiking Area / Trail';
  if (placeType === 'park') return 'Park';
  return 'Other';
}

function formatRating(rating: number | null, ratingCount: number | null): string {
  if (rating == null) return 'Not available';
  if (ratingCount == null) return `${rating.toFixed(1)}`;
  return `${rating.toFixed(1)} (${ratingCount.toLocaleString()} reviews)`;
}

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
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  title: {
    ...typography.titleLG,
    color: colors.textPrimary,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  infoBody: {
    flex: 1,
    gap: spacing.xxs,
  },
  fieldLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontFamily: 'Inter_700Bold',
  },
  infoValue: {
    ...typography.body,
    color: colors.textPrimary,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
  photoStrip: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  photo: {
    width: 220,
    height: 150,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  valueText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  emptyValue: {
    ...typography.bodyMuted,
  },
  errorText: {
    ...typography.body,
    color: colors.danger,
    textAlign: 'center',
  },
  addButton: {
    minHeight: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    ...shadow.sm,
  },
  addButtonPressed: {
    opacity: 0.88,
  },
  addButtonDisabled: {
    opacity: 0.65,
  },
  addButtonText: {
    ...typography.body,
    color: colors.surface,
    fontFamily: 'Inter_700Bold',
  },
});
