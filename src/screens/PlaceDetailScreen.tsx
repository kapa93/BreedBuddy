import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { NUZZLE_TAB_BAR_LAYOUT_EXTENDS_BELOW_SCREEN } from '@/navigation/NuzzleTabBar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DogAvatar } from '@/components/DogAvatar';
import { MetThisDogButton } from '@/components/MetThisDogButton';
import { useStackHeaderHeight } from '@/hooks/useStackHeaderHeight';
import { useSavedPlaces, useToggleSavedPlace } from '@/hooks/useSavedPlaces';
import { getActivePlaceCheckins, getPlaceById } from '@/api/places';
import { deletePost, getPlaceMeetupPosts, getPlacePosts } from '@/api/posts';
import { rsvpMeetup, unrsvpMeetup } from '@/api/meetups';
import { setReaction } from '@/api/reactions';
import { FeedItem } from '@/components/FeedItem';
import { getDogsByOwner } from '@/api/dogs';
import { useAuthStore } from '@/store/authStore';
import { BREED_LABELS, PLAY_STYLE_LABELS, formatRelativeTime } from '@/utils/breed';
import { colors, radius, shadow, spacing, typography } from '@/theme';
import type { ActivePlaceCheckin, Dog, PlaceTypeEnum, PostWithDetails, ReactionEnum } from '@/types';

const PLACE_TYPE_LABELS: Record<PlaceTypeEnum, string> = {
  dog_beach: 'Dog Beach',
  dog_park: 'Dog Park',
  trail: 'Trail',
  park: 'Park',
  other: 'Place',
};

type PlaceDetailTab = 'feed' | 'dogs' | 'meetups';
const TABS: { key: PlaceDetailTab; label: string }[] = [
  { key: 'feed', label: 'Feed' },
  { key: 'dogs', label: 'Dogs' },
  { key: 'meetups', label: 'Meetups' },
];

/** Match ScrollDirectionContext — local only so we do not hide stack header / tab bar here */
const PLACE_SCROLL_THRESHOLD = 3;
const PLACE_AT_TOP_THRESHOLD = 10;
const PLACE_AT_BOTTOM_THRESHOLD = 10;
const SUMMARY_TOGGLE_MS = 200;

type Props = {
  route: { params: { placeId: string } };
  navigation: {
    navigate: (screen: string, params?: object) => void;
    setOptions: (opts: object) => void;
  };
};

export function PlaceDetailScreen({ route, navigation }: Props) {
  const { placeId } = route.params;
  const { user } = useAuthStore();
  const tabBarHeight = useBottomTabBarHeight();
  const tabBarScrollPad = Math.max(0, tabBarHeight - NUZZLE_TAB_BAR_LAYOUT_EXTENDS_BELOW_SCREEN);
  const headerHeight = useStackHeaderHeight();
  const [activeTab, setActiveTab] = useState<PlaceDetailTab>('feed');

  const { data: place, isLoading: placeLoading } = useQuery({
    queryKey: ['place', placeId],
    queryFn: () => getPlaceById(placeId),
  });

  const { data: activeCheckins = [], isLoading: checkinsLoading } = useQuery({
    queryKey: ['placeActiveCheckins', placeId],
    queryFn: () => getActivePlaceCheckins(placeId),
    refetchInterval: 60_000,
  });

  const { data: placeMeetups = [], isLoading: meetupsLoading } = useQuery({
    queryKey: ['placeMeetups', placeId],
    queryFn: () => getPlaceMeetupPosts(placeId, user?.id ?? null),
  });

  const { data: placePosts = [], isLoading: feedLoading } = useQuery({
    queryKey: ['placePosts', placeId],
    queryFn: () => getPlacePosts(placeId, user?.id ?? null),
  });

  const { data: myDogs = [] } = useQuery({
    queryKey: ['dogs', user?.id],
    queryFn: () => getDogsByOwner(user!.id),
    enabled: !!user?.id,
  });

  const { savedPlaceIds } = useSavedPlaces(user?.id);
  const toggleSave = useToggleSavedPlace();

  const queryClient = useQueryClient();
  const [reactionMenuOpen, setReactionMenuOpen] = useState(false);
  const lastScrollY = useRef(0);
  const summaryMeasuredHeight = useSharedValue(0);
  /** 1 = summary visible, 0 = collapsed (tabs sit under stack header) */
  const summaryExpanded = useSharedValue(1);

  const placePostsQueryKey = useMemo(() => ['placePosts', placeId] as const, [placeId]);
  const placeMeetupsQueryKey = useMemo(() => ['placeMeetups', placeId] as const, [placeId]);

  const patchPostReactions = useCallback(
    (old: PostWithDetails[] | undefined, postId: string, reaction: ReactionEnum | null) => {
      if (!old) return old;
      return old.map((p) => {
        if (p.id !== postId) return p;
        const prevReaction = p.user_reaction;
        const counts = { ...(p.reaction_counts ?? {}) } as Partial<Record<ReactionEnum, number>>;
        if (prevReaction) {
          counts[prevReaction] = Math.max(0, (counts[prevReaction] ?? 1) - 1);
        }
        if (reaction) {
          counts[reaction] = (counts[reaction] ?? 0) + 1;
        }
        return { ...p, user_reaction: reaction, reaction_counts: counts };
      });
    },
    [],
  );

  const reactionMutation = useMutation({
    mutationFn: ({ postId, reaction }: { postId: string; reaction: ReactionEnum | null }) =>
      setReaction(postId, user!.id, reaction),
    onMutate: async ({ postId, reaction }) => {
      await queryClient.cancelQueries({ queryKey: placePostsQueryKey });
      await queryClient.cancelQueries({ queryKey: placeMeetupsQueryKey });
      const prevPosts = queryClient.getQueryData<PostWithDetails[]>(placePostsQueryKey);
      const prevMeetups = queryClient.getQueryData<PostWithDetails[]>(placeMeetupsQueryKey);
      queryClient.setQueryData<PostWithDetails[]>(placePostsQueryKey, (old) =>
        patchPostReactions(old, postId, reaction),
      );
      queryClient.setQueryData<PostWithDetails[]>(placeMeetupsQueryKey, (old) =>
        patchPostReactions(old, postId, reaction),
      );
      return { prevPosts, prevMeetups };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prevPosts !== undefined) queryClient.setQueryData(placePostsQueryKey, ctx.prevPosts);
      if (ctx?.prevMeetups !== undefined) queryClient.setQueryData(placeMeetupsQueryKey, ctx.prevMeetups);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: placePostsQueryKey });
      queryClient.invalidateQueries({ queryKey: placeMeetupsQueryKey });
    },
  });

  const patchMeetupRsvp = useCallback((old: PostWithDetails[] | undefined, postId: string, rsvped: boolean) => {
    if (!old) return old;
    return old.map((p) => {
      if (p.id !== postId || p.type !== 'MEETUP') return p;
      const wasRsvped = p.user_rsvped ?? false;
      const delta = rsvped ? -1 : 1;
      return {
        ...p,
        user_rsvped: !wasRsvped,
        attendee_count: Math.max(0, (p.attendee_count ?? 0) + delta),
      };
    });
  }, []);

  const rsvpMutation = useMutation({
    mutationFn: ({ postId, rsvped }: { postId: string; rsvped: boolean }) =>
      rsvped ? unrsvpMeetup(postId, user!.id) : rsvpMeetup(postId, user!.id),
    onMutate: async ({ postId, rsvped }) => {
      await queryClient.cancelQueries({ queryKey: placePostsQueryKey });
      await queryClient.cancelQueries({ queryKey: placeMeetupsQueryKey });
      const prevPosts = queryClient.getQueryData<PostWithDetails[]>(placePostsQueryKey);
      const prevMeetups = queryClient.getQueryData<PostWithDetails[]>(placeMeetupsQueryKey);
      queryClient.setQueryData<PostWithDetails[]>(placePostsQueryKey, (old) =>
        patchMeetupRsvp(old, postId, rsvped),
      );
      queryClient.setQueryData<PostWithDetails[]>(placeMeetupsQueryKey, (old) =>
        patchMeetupRsvp(old, postId, rsvped),
      );
      return { prevPosts, prevMeetups };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prevPosts !== undefined) queryClient.setQueryData(placePostsQueryKey, ctx.prevPosts);
      if (ctx?.prevMeetups !== undefined) queryClient.setQueryData(placeMeetupsQueryKey, ctx.prevMeetups);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: placePostsQueryKey });
      queryClient.invalidateQueries({ queryKey: placeMeetupsQueryKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (postId: string) => deletePost(postId, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: placePostsQueryKey });
      queryClient.invalidateQueries({ queryKey: placeMeetupsQueryKey });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['post'] });
    },
  });

  // Update nav header title when place loads
  React.useEffect(() => {
    if (place?.name) {
      navigation.setOptions({ title: place.name });
    }
  }, [place?.name, navigation]);

  const isSaved = place ? savedPlaceIds.has(place.id) : false;
  const locationLine = place
    ? [place.neighborhood, place.city].filter(Boolean).join(', ')
    : '';

  const handleDogPress = useCallback(
    (dogId: string) => navigation.navigate('DogProfile', { dogId }),
    [navigation],
  );
  const handleCheckinPress = useCallback(
    () => navigation.navigate('PlaceNow', { placeId }),
    [navigation, placeId],
  );

  const handlePostPress = useCallback(
    (postId: string) => navigation.navigate('PostDetail', { postId }),
    [navigation],
  );
  const handleAuthorPress = useCallback(
    (authorId: string) => navigation.navigate('UserProfile', { userId: authorId }),
    [navigation],
  );
  const handleReactionSelect = useCallback(
    (postId: string, reaction: ReactionEnum | null) => {
      if (!user) return;
      reactionMutation.mutate({ postId, reaction });
    },
    [reactionMutation, user],
  );
  const handleRsvpToggle = useCallback(
    (postId: string, rsvped: boolean) => {
      if (!user) return;
      rsvpMutation.mutate({ postId, rsvped });
    },
    [rsvpMutation, user],
  );
  const handleEditPost = useCallback(
    (postId: string) => navigation.navigate('EditPost', { postId }),
    [navigation],
  );
  const handleDeletePost = useCallback(
    (postId: string) => {
      Alert.alert(
        'Delete post',
        'Are you sure you want to delete this post? This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(postId) },
        ],
      );
    },
    [deleteMutation],
  );

  const dogListData = useMemo(() => activeCheckins, [activeCheckins]);

  const renderFeedItem = useCallback(
    ({ item, index }: { item: PostWithDetails; index: number }) => (
      <FeedItem
        item={item}
        showBottomBorder={index < placePosts.length - 1}
        onPostPress={handlePostPress}
        onAuthorPress={handleAuthorPress}
        onReactionSelect={handleReactionSelect}
        onReactionMenuOpenChange={setReactionMenuOpen}
        onRsvpToggle={handleRsvpToggle}
        currentUserId={user?.id ?? null}
        onEdit={handleEditPost}
        onDelete={handleDeletePost}
      />
    ),
    [
      placePosts.length,
      handlePostPress,
      handleAuthorPress,
      handleReactionSelect,
      handleRsvpToggle,
      handleEditPost,
      handleDeletePost,
      user?.id,
    ],
  );

  const renderMeetupFeedItem = useCallback(
    ({ item, index }: { item: PostWithDetails; index: number }) => (
      <FeedItem
        item={item}
        showBottomBorder={index < placeMeetups.length - 1}
        onPostPress={handlePostPress}
        onAuthorPress={handleAuthorPress}
        onReactionSelect={handleReactionSelect}
        onReactionMenuOpenChange={setReactionMenuOpen}
        onRsvpToggle={handleRsvpToggle}
        currentUserId={user?.id ?? null}
        onEdit={handleEditPost}
        onDelete={handleDeletePost}
      />
    ),
    [
      placeMeetups.length,
      handlePostPress,
      handleAuthorPress,
      handleReactionSelect,
      handleRsvpToggle,
      handleEditPost,
      handleDeletePost,
      user?.id,
    ],
  );

  const keyExtractPost = useCallback((item: PostWithDetails) => item.id, []);

  const onSummaryLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0) {
      summaryMeasuredHeight.value = Math.max(summaryMeasuredHeight.value, h);
    }
  }, []);

  const onScrollHidePlaceSummary = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (reactionMenuOpen) return;
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const y = contentOffset.y;
      const diff = y - lastScrollY.current;
      lastScrollY.current = y;
      if (Math.abs(diff) < PLACE_SCROLL_THRESHOLD) return;
      if (y < PLACE_AT_TOP_THRESHOLD && diff > 0) return;
      const atBottom =
        contentSize.height > 0 &&
        layoutMeasurement &&
        y + layoutMeasurement.height >= contentSize.height - PLACE_AT_BOTTOM_THRESHOLD;
      if (atBottom && diff < 0) return;
      if (diff > 0) {
        summaryExpanded.value = withTiming(0, { duration: SUMMARY_TOGGLE_MS });
      } else {
        summaryExpanded.value = withTiming(1, { duration: SUMMARY_TOGGLE_MS });
      }
    },
    [reactionMenuOpen],
  );

  const summaryAnimatedStyle = useAnimatedStyle(() => {
    const h = summaryMeasuredHeight.value;
    const exp = summaryExpanded.value;
    if (h <= 0) {
      return { overflow: 'hidden' as const };
    }
    return {
      height: h * exp,
      opacity: exp,
      overflow: 'hidden' as const,
    };
  });

  React.useEffect(() => {
    summaryExpanded.value = withTiming(1, { duration: SUMMARY_TOGGLE_MS });
    lastScrollY.current = 0;
  }, [activeTab]);

  if (placeLoading) {
    return (
      <View style={styles.screenRoot}>
        <SafeAreaView style={styles.safe} edges={['left', 'right']}>
          <View style={[styles.centered, { paddingTop: headerHeight + spacing.xl }]}>
            <Text style={styles.helperText}>Loading...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (!place) {
    return (
      <View style={styles.screenRoot}>
        <SafeAreaView style={styles.safe} edges={['left', 'right']}>
          <View style={[styles.centered, { paddingTop: headerHeight + spacing.xl }]}>
            <Text style={styles.helperText}>Place not found.</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screenRoot}>
      <SafeAreaView style={styles.safe} edges={['left', 'right']}>
        {/* Sticky header: place summary + tab bar */}
        <View style={[styles.stickyHeader, { paddingTop: headerHeight + spacing.sm }]}>
          <Animated.View style={summaryAnimatedStyle}>
            <View style={styles.summaryRow} onLayout={onSummaryLayout}>
              <View style={styles.summaryLeft}>
                <View style={styles.typeChip}>
                  <Text style={styles.typeChipText}>{PLACE_TYPE_LABELS[place.place_type]}</Text>
                </View>
                {locationLine ? (
                  <Text style={styles.locationText} numberOfLines={1}>
                    {locationLine}
                  </Text>
                ) : null}
              </View>

              <View style={styles.summaryRight}>
                <Pressable
                  onPress={() => navigation.navigate('CreatePost', {
                    initialPlaceId: place.id,
                    initialPlaceName: place.name,
                  })}
                  style={({ pressed }) => [styles.postHereBtn, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Post here"
                >
                  <Ionicons name="create-outline" size={14} color={colors.primary} />
                  <Text style={styles.postHereBtnText}>Post here</Text>
                </Pressable>
                {place.supports_check_in && (
                  <Pressable
                    onPress={handleCheckinPress}
                    style={({ pressed }) => [styles.checkinBtn, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Check in at this place"
                  >
                    <Text style={styles.checkinBtnText}>Check In</Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={() => toggleSave.mutate({ placeId: place.id, isSaved })}
                  hitSlop={10}
                  style={({ pressed }) => pressed && styles.pressed}
                  accessibilityRole="button"
                  accessibilityLabel={isSaved ? 'Unsave place' : 'Save place'}
                  accessibilityState={{ selected: isSaved }}
                >
                  <Ionicons
                    name={isSaved ? 'bookmark' : 'bookmark-outline'}
                    size={22}
                    color={isSaved ? colors.primary : colors.textMuted}
                  />
                </Pressable>
              </View>
            </View>
          </Animated.View>

          {/* Tab bar */}
          <View style={styles.tabBar}>
            {TABS.map(({ key, label }) => (
              <Pressable
                key={key}
                style={[styles.tab, activeTab === key && styles.tabActive]}
                onPress={() => setActiveTab(key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === key }}
              >
                <Text style={[styles.tabText, activeTab === key && styles.tabTextActive]}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Feed tab — posts with posts.place_id = this place */}
        {activeTab === 'feed' && (
          feedLoading ? (
            <View style={[styles.content, styles.centered]}>
              <Text style={styles.helperText}>Loading...</Text>
            </View>
          ) : placePosts.length === 0 ? (
            <ScrollView
              style={styles.content}
              contentContainerStyle={[styles.emptyTabContent, { paddingBottom: tabBarScrollPad }]}
              showsVerticalScrollIndicator={false}
              onScroll={onScrollHidePlaceSummary}
              scrollEventThrottle={16}
            >
              <EmptyState
                icon="newspaper-outline"
                title="No posts here yet"
                body="Be the first to post at this place."
                cta="Post here"
                onCtaPress={() => navigation.navigate('CreatePost', {
                  initialPlaceId: place.id,
                  initialPlaceName: place.name,
                })}
              />
            </ScrollView>
          ) : (
            <FlatList
              data={placePosts}
              keyExtractor={keyExtractPost}
              contentContainerStyle={{ paddingBottom: tabBarScrollPad }}
              scrollEnabled={!reactionMenuOpen}
              showsVerticalScrollIndicator={false}
              onScroll={onScrollHidePlaceSummary}
              scrollEventThrottle={16}
              renderItem={renderFeedItem}
              initialNumToRender={8}
              maxToRenderPerBatch={8}
              windowSize={11}
            />
          )
        )}

        {/* Dogs tab — live check-in data */}
        {activeTab === 'dogs' && (
          checkinsLoading ? (
            <View style={[styles.content, styles.centered]}>
              <Text style={styles.helperText}>Loading...</Text>
            </View>
          ) : activeCheckins.length === 0 ? (
            <ScrollView
              style={styles.content}
              contentContainerStyle={[styles.emptyTabContent, { paddingBottom: tabBarScrollPad }]}
              showsVerticalScrollIndicator={false}
              onScroll={onScrollHidePlaceSummary}
              scrollEventThrottle={16}
            >
              <EmptyState
                icon="paw-outline"
                title="No dogs here right now"
                body="Check back soon — dogs who check in will appear here."
              />
            </ScrollView>
          ) : (
            <FlatList
              data={dogListData}
              keyExtractor={(item) => item.id}
              contentContainerStyle={[styles.listContent, { paddingBottom: tabBarScrollPad }]}
              showsVerticalScrollIndicator={false}
              onScroll={onScrollHidePlaceSummary}
              scrollEventThrottle={16}
              renderItem={({ item }) => (
                <DogRow
                  item={item}
                  userId={user?.id ?? null}
                  myDogs={myDogs}
                  placeName={place.name}
                  onDogPress={handleDogPress}
                />
              )}
            />
          )
        )}

        {/* Meetups tab — place-linked meetup posts */}
        {activeTab === 'meetups' && (
          meetupsLoading ? (
            <View style={[styles.content, styles.centered]}>
              <Text style={styles.helperText}>Loading...</Text>
            </View>
          ) : placeMeetups.length === 0 ? (
            <ScrollView
              style={styles.content}
              contentContainerStyle={[styles.emptyTabContent, { paddingBottom: tabBarScrollPad }]}
              showsVerticalScrollIndicator={false}
              onScroll={onScrollHidePlaceSummary}
              scrollEventThrottle={16}
            >
              <EmptyState
                icon="calendar-outline"
                title="No meetups scheduled here"
                body="Meetups at this place will show up here once they're added."
              />
            </ScrollView>
          ) : (
            <FlatList
              data={placeMeetups}
              keyExtractor={keyExtractPost}
              contentContainerStyle={{ paddingBottom: tabBarScrollPad }}
              scrollEnabled={!reactionMenuOpen}
              showsVerticalScrollIndicator={false}
              onScroll={onScrollHidePlaceSummary}
              scrollEventThrottle={16}
              renderItem={renderMeetupFeedItem}
              initialNumToRender={8}
              maxToRenderPerBatch={8}
              windowSize={11}
            />
          )
        )}
      </SafeAreaView>
    </View>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

type EmptyStateProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  body: string;
  cta?: string;
  onCtaPress?: () => void;
};
function EmptyState({ icon, title, body, cta, onCtaPress }: EmptyStateProps) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name={icon} size={36} color={colors.textMuted} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {cta && onCtaPress ? (
        <Pressable
          onPress={onCtaPress}
          style={({ pressed }) => [styles.emptyCta, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={cta}
        >
          <Text style={styles.emptyCtaText}>{cta}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

type DogRowProps = {
  item: ActivePlaceCheckin;
  userId: string | null;
  myDogs: Dog[];
  placeName: string;
  onDogPress: (dogId: string) => void;
};
function DogRow({ item, userId, myDogs, placeName, onDogPress }: DogRowProps) {
  return (
    <View style={styles.row}>
      <Pressable onPress={() => onDogPress(item.dog_id)} style={styles.rowIdentity}>
        <DogAvatar imageUrl={item.dog_image_url} name={item.dog_name} size={44} />
        <View style={styles.rowText}>
          <View style={styles.rowNameRow}>
            <Text style={styles.dogName}>{item.dog_name}</Text>
            {item.dog_play_style ? (
              <View style={styles.playStyleChip}>
                <Text style={styles.playStyleChipText}>
                  {PLAY_STYLE_LABELS[item.dog_play_style]}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.rowMeta}>
            {BREED_LABELS[item.dog_breed]}
            {item.owner_name ? ` • ${item.owner_name}` : ''}
          </Text>
        </View>
      </Pressable>

      <View style={styles.rowSide}>
        <Text style={styles.rowTime}>{formatRelativeTime(item.created_at)}</Text>
        <MetThisDogButton
          viewerUserId={userId}
          viewerDogs={myDogs}
          targetDog={{ id: item.dog_id, name: item.dog_name }}
          sourceType="dog_beach"
          locationName={placeName}
          compact
          alignRight
        />
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screenRoot: { flex: 1, backgroundColor: colors.surface },
  safe: { flex: 1 },

  stickyHeader: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
  },
  summaryLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  typeChip: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  typeChipText: {
    ...typography.caption,
    color: colors.primaryDark,
    fontFamily: 'Inter_700Bold',
  },
  locationText: {
    ...typography.caption,
    color: colors.textMuted,
    flexShrink: 1,
  },
  summaryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginLeft: spacing.sm,
  },
  postHereBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  postHereBtnText: {
    ...typography.caption,
    color: colors.primary,
    fontFamily: 'Inter_700Bold',
  },
  checkinBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  checkinBtnText: {
    ...typography.caption,
    color: colors.surface,
    fontFamily: 'Inter_700Bold',
  },

  // Tab bar (same pattern as ExploreScreen)
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -1,
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    ...typography.body,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
  },
  tabTextActive: {
    fontFamily: 'Inter_700Bold',
    color: colors.primary,
  },

  // Shared content containers
  content: { flex: 1 },
  emptyTabContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  listContent: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    gap: spacing.sm,
    maxWidth: 260,
  },
  emptyTitle: {
    ...typography.subtitle,
    textAlign: 'center',
  },
  emptyBody: {
    ...typography.bodyMuted,
    textAlign: 'center',
  },
  emptyCta: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  emptyCtaText: {
    ...typography.caption,
    color: colors.primary,
    fontFamily: 'Inter_700Bold',
  },

  // Dog row
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.sm,
  },
  rowIdentity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  rowText: { flex: 1, marginLeft: spacing.md },
  rowNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
    flex: 1,
  },
  dogName: { ...typography.subtitle },
  playStyleChip: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  playStyleChipText: {
    ...typography.caption,
    color: colors.primaryDark,
    fontFamily: 'Inter_700Bold',
  },
  rowMeta: { ...typography.caption, marginTop: spacing.xxs },
  rowSide: {
    alignSelf: 'stretch',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginLeft: spacing.sm,
    marginRight: 5,
  },
  rowTime: { ...typography.caption, flexShrink: 0, textAlign: 'right', marginRight: 5 },

  // Loading/helper
  helperText: { ...typography.bodyMuted },
  pressed: { opacity: 0.9 },
});
