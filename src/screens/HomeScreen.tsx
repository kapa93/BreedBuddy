import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
  ImageBackground,
  Platform,
} from "react-native";
import { useScrollToTop } from "@react-navigation/native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from 'expo-location';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useAuthStore } from "@/store/authStore";
import { useOnboardingStore } from '@/store/onboardingStore';
import { OnboardingCompleteCard } from "@/components/OnboardingCompleteCard";
import { CreatePostPromptCard } from "@/components/CreatePostPromptCard";
import { MeetupPromptCard } from "@/components/MeetupPromptCard";
import { useUIStore } from "@/store/uiStore";
import { getDogsByOwner } from "@/api/dogs";
import { getJoinedBreeds, joinBreedFeed, leaveBreedFeed } from "@/api/breedJoins";
import { checkIntoPlace,
  getMyActivePlaceCheckins,
  getPlaceBySlug,
} from '@/api/places';
import { BreedHero } from "@/ui/BreedHero";
import { SwipeableBreedBanner } from "@/ui/SwipeableBreedBanner";
import { SegmentTabs } from "@/ui/SegmentTabs";
import { PlaceNearbyAlert } from '@/components/PlaceNearbyAlert';
import { getBreedHeroImageSource, getBreedHeroImageStyle, getBreedHeroTitle } from "@/utils/breedAssets";
import { BREED_LABELS } from "@/utils/breed";
import {
  OB_DOG_BEACH_SLUG,
  DEBUG_FORCE_NEARBY,
  ENABLE_HOME_PLACE_PROXIMITY_LOCATION,
} from '@/config/places';
import { getDistanceMeters } from '@/utils/location';
import { useScrollDirection, useScrollDirectionUpdater } from "@/context/ScrollDirectionContext";
import { useStackHeaderHeight } from "@/hooks/useStackHeaderHeight";
import { useFeedData } from "@/hooks/useFeedData";
import { NotificationsSheet } from "@/components/NotificationsSheet";
import { colors, radius, spacing, typography } from "@/theme";
import type { FeedFilter } from "@/store/uiStore";
import { captureHandledError } from '@/lib/sentry';
import { Bell } from 'lucide-react-native';
import { getPackItems } from "@/utils/breedAssets";

const CARD_GAP = spacing.md;
const H_PADDING = spacing.lg;
const NUM_COLUMNS = 2;

type HomeTab = "myBreeds" | "moreBreeds";

const TABS = ["All", "Questions", "Meetups", "Tips", "Update/Story"] as const;
type TabKey = (typeof TABS)[number];

const TAB_TO_FILTER: Record<TabKey, FeedFilter> = {
  All: "all",
  Questions: "QUESTION",
  Meetups: "MEETUP",
  Tips: "TIP",
  "Update/Story": "UPDATE_STORY",
};

const FILTER_TO_TAB = (f: FeedFilter): TabKey =>
  f === "all" ? "All" : f === "TIP" ? "Tips" : f === "QUESTION" ? "Questions" : f === "MEETUP" ? "Meetups" : "Update/Story";

const ALERT_ANIM_DURATION = 220;
const TAB_BAR_ANIM_DURATION = 220;
const TAB_BAR_HIDE_OVERSHOOT = 40;

export function HomeScreen({
  navigation,
}: {
  navigation: {
    navigate: (s: string, p?: object) => void;
    setOptions: (opts: object) => void;
  };
}) {
  const {
    user,
  } = useAuthStore();
  const {
    onboardingDog,
    dismissOnboardingCard,
    showPostPrompt,
    dismissPostPrompt,
    showMeetupPrompt,
    dismissMeetupPrompt,
  } = useOnboardingStore();
  const { onScroll } = useScrollDirectionUpdater();
  const { scrollDirection } = useScrollDirection();
  const headerHeight = useStackHeaderHeight();
  const flatListRef = useRef<FlatList>(null);
  useScrollToTop(flatListRef);
  const { feedFilter, setFeedFilter } = useUIStore();
  const queryClient = useQueryClient();
  const [selectedDogIndex, setSelectedDogIndex] = useState(0);
  const [selectedBreedIndex, setSelectedBreedIndex] = useState(0);
  const [isNearPlace, setIsNearPlace] = useState(false);
  const [locationChecked, setLocationChecked] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [homeTab, setHomeTab] = useState<HomeTab>("myBreeds");
  const [homeTabBarHeight, setHomeTabBarHeight] = useState(0);
  const { width } = useWindowDimensions();
  const cardWidth = (width - H_PADDING * 2 - CARD_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS + 1;
  const packItems = useMemo(() => getPackItems(), []);

  React.useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable
          onPress={() => setNotificationsOpen(true)}
          style={({ pressed }) => [styles.bellIcon, pressed && styles.myPlacesChipPressed]}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
        >
          <Bell size={24} color="#000000" />
        </Pressable>
      ),
    });
  }, [navigation]);
  const forceNearby = __DEV__ && DEBUG_FORCE_NEARBY;
  const placeAlertTranslateY = useSharedValue(0);

  const { data: dogs = [], isLoading: isDogsLoading } = useQuery({
    queryKey: ["dogs", user?.id],
    queryFn: () => getDogsByOwner(user!.id),
    enabled: !!user?.id,
  });

  const { data: joinedBreeds = [] } = useQuery({
    queryKey: ["joinedBreeds", user?.id],
    queryFn: () => getJoinedBreeds(user!.id),
    enabled: !!user?.id,
  });

  const { data: obPlace } = useQuery({
    queryKey: ['place', OB_DOG_BEACH_SLUG],
    queryFn: () => getPlaceBySlug(OB_DOG_BEACH_SLUG),
    enabled: !!user?.id,
    staleTime: 10 * 60_000,
  });

  const { data: myPlaceCheckins = [] } = useQuery({
    queryKey: ['placeMyCheckins', user?.id, obPlace?.id],
    queryFn: () => getMyActivePlaceCheckins(obPlace!.id, user!.id),
    enabled: !!user?.id && !!obPlace?.id,
    refetchInterval: 60_000,
  });

  const selectedDog = dogs?.[selectedDogIndex];
  const defaultBreed = selectedDog?.breed ?? "GOLDEN_RETRIEVER";
  const breed =
    joinedBreeds.length > 0
      ? joinedBreeds[Math.min(selectedBreedIndex, joinedBreeds.length - 1)] ?? defaultBreed
      : defaultBreed;

  const isJoined = joinedBreeds.includes(breed);
  const myPlaceCheckinDogIds = new Set(myPlaceCheckins.map((checkin) => checkin.dog_id));
  const availableDogsForPlaceCheckIn = dogs.filter((dog) => !myPlaceCheckinDogIds.has(dog.id));
  const showNearbyCheckinCard =
    locationChecked && isNearPlace && availableDogsForPlaceCheckIn.length > 0 && !!obPlace;

  const joinMutation = useMutation({
    mutationFn: (b: import("@/types").BreedEnum) => joinBreedFeed(user!.id, b),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["joinedBreeds", user?.id] });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: (b: import("@/types").BreedEnum) => leaveBreedFeed(user!.id, b),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["joinedBreeds", user?.id] });
    },
  });

  const checkinMutation = useMutation({
    mutationFn: (dogIds: string[]) =>
      checkIntoPlace(obPlace!.id, user!.id, dogIds, obPlace!.check_in_duration_minutes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['placeActiveCheckins', obPlace?.id] });
      queryClient.invalidateQueries({ queryKey: ['placeMyCheckins', user?.id, obPlace?.id] });
    },
    onError: (error) => {
      captureHandledError(error, {
        area: 'place.check-in',
        tags: { screen: 'home' },
      });
      Alert.alert('Could not check in', 'Please try again in a moment.');
    },
  });

  useEffect(() => {
    if (!ENABLE_HOME_PLACE_PROXIMITY_LOCATION) return;
    if (!user?.id || !obPlace) return;
    let isCancelled = false;

    const checkProximity = async () => {
      try {
        const permission = await Location.getForegroundPermissionsAsync();
        let status = permission.status;
        if (status === 'undetermined' && permission.canAskAgain) {
          const requested = await Location.requestForegroundPermissionsAsync();
          status = requested.status;
        }
        if (status !== 'granted') {
          if (!isCancelled) {
            setIsNearPlace(false);
            setLocationChecked(true);
          }
          return;
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const distanceMeters = getDistanceMeters(
          position.coords.latitude,
          position.coords.longitude,
          obPlace.latitude!,
          obPlace.longitude!
        );
        if (!isCancelled) {
          setIsNearPlace(forceNearby || distanceMeters <= obPlace.check_in_radius_meters);
          setLocationChecked(true);
        }
      } catch (error) {
        captureHandledError(error, {
          area: 'place.location-check',
          tags: { screen: 'home' },
        });
        if (!isCancelled) {
          setIsNearPlace(forceNearby);
          setLocationChecked(true);
        }
      }
    };

    checkProximity();
    const intervalId = setInterval(checkProximity, 5 * 60_000);
    return () => {
      isCancelled = true;
      clearInterval(intervalId);
    };
  }, [user?.id, obPlace, forceNearby, ENABLE_HOME_PLACE_PROXIMITY_LOCATION]);

  useEffect(() => {
    placeAlertTranslateY.value = withTiming(scrollDirection === 'down' ? -(headerHeight - 48) : 0, {
      duration: ALERT_ANIM_DURATION,
    });
  }, [scrollDirection, headerHeight, placeAlertTranslateY]);

  const placeAlertAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: placeAlertTranslateY.value }],
    };
  });

  const tabBarTranslate = useSharedValue(0);

  useEffect(() => {
    const hideOffset = homeTabBarHeight + TAB_BAR_HIDE_OVERSHOOT;
    tabBarTranslate.value = withTiming(scrollDirection === 'down' ? -hideOffset : 0, {
      duration: TAB_BAR_ANIM_DURATION,
    });
  }, [scrollDirection, homeTabBarHeight, tabBarTranslate]);

  const tabBarAnimatedStyle = useAnimatedStyle(() => {
    const hideOffset = homeTabBarHeight + TAB_BAR_HIDE_OVERSHOOT;
    const opacity = interpolate(
      tabBarTranslate.value,
      [-hideOffset, -homeTabBarHeight, 0],
      [0, 0.75, 1],
    );
    return {
      opacity,
      transform: [{ translateY: tabBarTranslate.value }],
    };
  });

  const handleJoinPress = () => {
    if (isJoined) {
      leaveMutation.mutate(breed);
    } else {
      joinMutation.mutate(breed);
    }
  };

  const handleJoinPressForBreed = (b: import("@/types").BreedEnum) => {
    const joined = joinedBreeds.includes(b);
    if (joined) {
      leaveMutation.mutate(b);
    } else {
      joinMutation.mutate(b);
    }
  };

  const handlePlaceCheckIn = useCallback(() => {
    if (!dogs || dogs.length === 0) {
      Alert.alert('No dog profile', 'Add a dog profile before checking in.');
      return;
    }
    if (availableDogsForPlaceCheckIn.length === 0) {
      Alert.alert('All set', 'All of your dogs are already checked in.');
      return;
    }
    if (availableDogsForPlaceCheckIn.length === 1) {
      checkinMutation.mutate([availableDogsForPlaceCheckIn[0].id]);
      return;
    }
    Alert.alert(
      'Choose dogs',
      'Which of your dogs are here right now?',
      [
        {
          text: availableDogsForPlaceCheckIn.length === 2 ? 'Both dogs' : 'All my dogs',
          onPress: () => checkinMutation.mutate(availableDogsForPlaceCheckIn.map((dog) => dog.id)),
        },
        ...availableDogsForPlaceCheckIn.map((dog) => ({
          text: dog.name,
          onPress: () => checkinMutation.mutate([dog.id]),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ]
    );
  }, [availableDogsForPlaceCheckIn, checkinMutation, dogs]);

  const handleSentryTestCapture = useCallback(() => {
    captureHandledError(new Error('Manual Sentry test capture from Home screen'), {
      area: 'sentry.manual-test',
      tags: { screen: 'home', env: 'dev' },
    });
    Alert.alert('Sentry test sent', 'Check your Sentry project for a handled event.');
  }, []);

  const tabBarHeight = useBottomTabBarHeight();
  const typeFilter = feedFilter === "QUESTION" || feedFilter === "UPDATE_STORY" || feedFilter === "TIP" || feedFilter === "MEETUP" ? feedFilter : null;

  const {
    feedQueryKey,
    posts,
    isLoading,
    isFetchingNextPage,
    isPullRefreshing,
    reactionMenuOpen,
    handleRefresh,
    handlePostPress,
    handleEditPost,
    handleAuthorPress,
    handleDeletePost,
    handleReactionSelect,
    handleRsvpToggle,
    handleEndReached,
    renderFeedItem,
  } = useFeedData({
    breed,
    feedFilter,
    typeFilter,
    user,
    navigation,
    enabled: !!user?.id,
  });

  const [initialLoadDone, setInitialLoadDone] = useState(false);

  useEffect(() => {
    if (!isDogsLoading && !isLoading && !initialLoadDone) {
      setInitialLoadDone(true);
    }
  }, [isDogsLoading, isLoading, initialLoadDone]);

  const showInitialLoader = !initialLoadDone && (isDogsLoading || isLoading);

  const tabKey = FILTER_TO_TAB(feedFilter);

  const renderHeader = useMemo(() => (
    <>
      {joinedBreeds.length < 1 && (dogs?.length ?? 0) > 1 && (
        <View style={styles.dogSelector}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dogSelectorScroll}
          >
            {(dogs ?? []).map((dog, idx) => (
              <Pressable
                key={dog.id}
                style={[
                  styles.dogChip,
                  selectedDogIndex === idx && styles.dogChipSelected,
                ]}
                onPress={() => setSelectedDogIndex(idx)}
              >
                <Text
                  style={[
                    styles.dogChipText,
                    selectedDogIndex === idx && styles.dogChipTextSelected,
                  ]}
                >
                  {dog.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
      <View>
        {joinedBreeds.length >= 1 ? (
          <SwipeableBreedBanner
            breeds={joinedBreeds}
            currentBreed={breed}
            onBreedChange={(b) => {
              const idx = joinedBreeds.indexOf(b);
              if (idx >= 0) setSelectedBreedIndex(idx);
            }}
            joinedBreeds={joinedBreeds}
            onJoinPress={handleJoinPressForBreed}
          />
        ) : (
          <BreedHero
          title={getBreedHeroTitle(breed)}
          image={getBreedHeroImageSource(breed)}
          imageStyle={getBreedHeroImageStyle(breed)}
          joined={isJoined}
          onJoinPress={handleJoinPress}
          />
        )}
      </View>
      <View style={styles.tabsSection}>
        <SegmentTabs
          tabs={[...TABS]}
          activeTab={tabKey}
          onChange={(tab) => setFeedFilter(TAB_TO_FILTER[tab as TabKey])}
        />
      </View>
      {showPostPrompt ? (
        <CreatePostPromptCard
          breed={breed}
          onCreatePost={() => {
            dismissPostPrompt();
            navigation.navigate('CreatePost', { breed });
          }}
          onDismiss={dismissPostPrompt}
        />
      ) : null}
      {showMeetupPrompt ? (
        <MeetupPromptCard
          onCreateMeetup={() => {
            dismissMeetupPrompt();
            navigation.navigate('CreatePost', { breed, initialType: 'MEETUP' });
          }}
          onExploreMeetups={() => {
            dismissMeetupPrompt();
            setFeedFilter('MEETUP');
          }}
        />
      ) : null}
    </>
  ), [
    showPostPrompt,
    dismissPostPrompt,
    showMeetupPrompt,
    dismissMeetupPrompt,
    navigation,
    joinedBreeds,
    dogs,
    selectedDogIndex,
    selectedBreedIndex,
    breed,
    isJoined,
    tabKey,
    handleJoinPress,
    handleJoinPressForBreed,
    setFeedFilter,
  ]);

  const renderEmpty = useCallback(() => (
    <View style={styles.empty}>
      <Text style={styles.emptyEmoji}>🐕</Text>
      <Text style={styles.emptyTitle}>No posts yet in {BREED_LABELS[breed]} community</Text>
      <Text style={styles.emptySub}>Be the first to share!</Text>
      <Text style={styles.link} onPress={() => navigation.navigate("CreatePost", { breed })}>
        Ask a question or share
      </Text>
    </View>
  ), [breed, navigation]);

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }, [isFetchingNextPage]);

  const renderSeparator = useCallback(() => <View style={styles.feedSeparator} />, []);

  if (!user) {
    return (
      <View style={styles.screen}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.center}>
            <Text style={styles.emptyText}>Sign in to see your feed</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (showInitialLoader) {
    return (
      <View style={styles.screen}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if ((!dogs || dogs.length === 0) && !onboardingDog) {
    return (
      <View style={styles.screen}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.center}>
            <Text style={styles.emptyText}>Add a dog profile to see your breed's feed</Text>
            <Text style={styles.link} onPress={() => navigation.navigate("Profile")}>
              Go to Profile
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <OnboardingCompleteCard
        visible={!!onboardingDog}
        dogName={onboardingDog?.name ?? ''}
        breed={onboardingDog?.breed ?? ''}
        onGoToFeed={dismissOnboardingCard}
        onExplore={() => {
          dismissOnboardingCard();
          navigation.navigate('Explore');
        }}
      />
      <SafeAreaView style={styles.safe} edges={["left", "right"]}>
        <View style={styles.container}>
          {__DEV__ ? (
            <Pressable
              onPress={handleSentryTestCapture}
              style={({ pressed }) => [styles.devSentryButton, pressed && styles.devSentryButtonPressed]}
            >
              <Text style={styles.devSentryButtonText}>Test Sentry</Text>
            </Pressable>
          ) : null}
          {showNearbyCheckinCard ? (
            <Animated.View style={[styles.placeAlertOverlay, { top: headerHeight + homeTabBarHeight + 12 }, placeAlertAnimatedStyle]}>
              {showNearbyCheckinCard ? (
                <PlaceNearbyAlert
                  placeName={obPlace!.name}
                  onCheckIn={handlePlaceCheckIn}
                  disabled={checkinMutation.isPending}
                />
              ) : null}
            </Animated.View>
          ) : null}
          {/* Tab bar overlay — hides on scroll down, shows on scroll up */}
          <Animated.View
            style={[styles.homeTabBarOverlay, { top: headerHeight }, tabBarAnimatedStyle]}
            onLayout={(e) => {
              const h = e.nativeEvent.layout.height;
              if (h > 0 && Math.abs(h - homeTabBarHeight) > 0.5) setHomeTabBarHeight(h);
            }}
          >
            <View style={styles.homeTabBar}>
              <Pressable
                style={[styles.homeTabChip, homeTab === "myBreeds" && styles.homeTabChipActive]}
                onPress={() => setHomeTab("myBreeds")}
              >
                <Text style={[styles.homeTabChipText, homeTab === "myBreeds" && styles.homeTabChipTextActive]}>
                  My Breeds
                </Text>
              </Pressable>
              <Pressable
                style={[styles.homeTabChip, homeTab === "moreBreeds" && styles.homeTabChipActive]}
                onPress={() => setHomeTab("moreBreeds")}
              >
                <Text style={[styles.homeTabChipText, homeTab === "moreBreeds" && styles.homeTabChipTextActive]}>
                  More Breeds
                </Text>
              </Pressable>
            </View>
          </Animated.View>

          {homeTab === "myBreeds" && (
            <FlatList
            ref={flatListRef}
            data={posts}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={renderHeader}
            scrollEnabled={!reactionMenuOpen}
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            windowSize={11}
            renderItem={renderFeedItem}
            ItemSeparatorComponent={renderSeparator}
            ListEmptyComponent={isLoading ? (
              <View style={[styles.initialLoader, { paddingBottom: tabBarHeight }]}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : renderEmpty}
            ListFooterComponent={renderFooter}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.5}
            refreshControl={
              <RefreshControl
                refreshing={isPullRefreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
                progressBackgroundColor={colors.primarySoft}
                style={{ backgroundColor: colors.primarySoft }}
              />
            }
            onScroll={onScroll}
            scrollEventThrottle={16}
            contentContainerStyle={[
              styles.listContent,
              { paddingTop: headerHeight + homeTabBarHeight },
              posts.length === 0 && styles.emptyList,
              scrollDirection === "down" && styles.listContentBarHidden,
            ]}
            showsVerticalScrollIndicator={false}
          />
          )}

          {homeTab === "moreBreeds" && (
            <ScrollView
              style={styles.breedsTabContainer}
              contentContainerStyle={[
                styles.breedsContent,
                { paddingTop: headerHeight + homeTabBarHeight + spacing.xl },
              ]}
              showsVerticalScrollIndicator={false}
              onScroll={onScroll}
              scrollEventThrottle={16}
            >
              <View style={styles.gridWrap}>
                <View style={styles.grid}>
                  {packItems.map((item) => (
                    <Pressable
                      key={item.breed}
                      style={[styles.cell, { width: cardWidth }]}
                      onPress={() => navigation.navigate("BreedFeed", { breed: item.breed })}
                    >
                      {({ pressed }) => (
                        <View style={styles.cardShadow}>
                          <ImageBackground
                            style={[styles.card, pressed && styles.pressed]}
                            imageStyle={[
                              styles.cardImage,
                              item.breed === "AUSTRALIAN_SHEPHERD" && styles.aussieCardImage,
                              item.breed === "DACHSHUND" && styles.dachshundCardImage,
                              item.breed === "FRENCH_BULLDOG" && styles.frenchieCardImage,
                              item.breed === "GERMAN_SHEPHERD" && styles.germanCardImage,
                              item.breed === "GOLDEN_DOODLE" && styles.goldenDoodleCardImage,
                              item.breed === "GOLDEN_RETRIEVER" && styles.goldenCardImage,
                              item.breed === "HUSKY" && styles.huskyCardImage,
                              item.breed === "MIXED_BREED" && styles.mixedBreedCardImage,
                              item.breed === "PUG" && styles.pugCardImage,
                              item.breed === "LABRADOODLE" && styles.labradoodleCardImage,
                              item.breed === "LABRADOR_RETRIEVER" && styles.labCardImage,
                              item.breed === "PIT_BULL" && styles.pitbullCardImage,
                            ]}
                            source={item.image}
                            resizeMode="cover"
                          >
                            <View style={styles.overlay} />
                            <Text
                              style={[
                                styles.cardLabel,
                                item.breed === "GERMAN_SHEPHERD" && styles.germanCardLabel,
                                item.breed === "GOLDEN_DOODLE" && styles.goldenDoodleCardLabel,
                              ]}
                              numberOfLines={item.breed === "GERMAN_SHEPHERD" ? 2 : 1}
                              adjustsFontSizeToFit={item.breed === "GOLDEN_DOODLE"}
                              minimumFontScale={0.8}
                            >
                              {item.breed === "AUSTRALIAN_SHEPHERD"
                                ? "Aussie"
                                : item.breed === "FRENCH_BULLDOG"
                                  ? "Frenchie"
                                  : item.breed === "GOLDEN_RETRIEVER"
                                    ? "Golden"
                                    : item.breed === "LABRADOR_RETRIEVER"
                                      ? "Labrador"
                                      : item.label}
                            </Text>
                          </ImageBackground>
                        </View>
                      )}
                    </Pressable>
                  ))}
                </View>
              </View>
              <Text style={styles.comingSoonText}>More breeds coming soon!</Text>
            </ScrollView>
          )}
        </View>
      </SafeAreaView>
      <NotificationsSheet
        visible={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        onPostPress={(postId) => navigation.navigate('PostDetail', { postId })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  safe: { flex: 1 },
  container: { flex: 1 },
  placeAlertOverlay: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 20,
    elevation: 20,
  },
  secondaryAlert: {
    marginTop: spacing.sm,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xxl,
  },
  empty: {
    padding: spacing.xxxl,
    alignItems: "center",
  },
  emptyList: { flexGrow: 1 },
  feedSeparator: { height: 0, borderBottomWidth: 1.5, borderBottomColor: colors.border },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.lg },
  emptyTitle: {
    ...typography.subtitle,
    color: colors.textPrimary,
    textAlign: "center",
  },
  emptySub: { ...typography.bodyMuted, marginTop: spacing.sm },
  emptyText: { ...typography.body },
  link: {
    marginTop: spacing.lg,
    color: colors.primary,
    ...typography.body,
    fontWeight: "700",
  },
  dogSelector: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dogSelectorScroll: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  dogChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dogChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dogChipText: { ...typography.bodyMuted, fontWeight: "700" },
  dogChipTextSelected: { color: colors.surface },
  breedSelector: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  breedSelectorScroll: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  breedChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  breedChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  breedChipText: { ...typography.bodyMuted, fontWeight: "700" },
  breedChipTextSelected: { color: colors.surface },
  tabsSection: {},
  bellIcon: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    position: "relative",
    bottom: 1,
    left: 5,
    transform: [{ translateX: 1 }],
  },
  myPlacesChipPressed: { opacity: 0.5 },
  listContent: { paddingBottom: spacing.xxxl },
  listContentBarHidden: { paddingBottom: spacing.sm },
  initialLoader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  footerLoader: { paddingVertical: spacing.xl, alignItems: 'center' },
  devSentryButton: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xxxl,
    zIndex: 50,
    backgroundColor: colors.textPrimary,
    borderRadius: radius.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  devSentryButtonPressed: {
    opacity: 0.85,
  },
  devSentryButtonText: {
    ...typography.caption,
    color: colors.surface,
    fontWeight: '700',
  },

  // Home tab bar overlay
  homeTabBarOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
    elevation: 10,
    backgroundColor: colors.surface,
  },
  homeTabBar: {
    flexDirection: 'row',
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginTop: spacing.sm,
  },
  homeTabChip: {
    flex: 1,
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm + 1,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -1.5,
  },
  homeTabChipActive: {
    borderBottomColor: colors.primary,
  },
  homeTabChipText: {
    ...typography.body,
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecondary,
  },
  homeTabChipTextActive: {
    fontFamily: 'Inter_600SemiBold',
    color: colors.primary,
  },

  // More Breeds grid
  breedsTabContainer: {
    flex: 1,
    marginTop: spacing.lg + 5,
  },
  breedsContent: {
    paddingHorizontal: H_PADDING,
    paddingBottom: spacing.xxxl + 75,
  },
  gridWrap: {
    alignItems: 'center',
    marginLeft: 10,
    marginTop: -spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -CARD_GAP / 2,
  },
  cell: {
    paddingHorizontal: CARD_GAP / 2,
    marginBottom: spacing.lg,
  },
  card: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.xl,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: spacing.md,
  },
  cardShadow: {
    borderRadius: radius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  cardImage: { borderRadius: radius.xl },
  aussieCardImage: {
    transform: [{ scale: 1.25 }, { translateX: 10 }, { translateY: -10 }],
  },
  dachshundCardImage: {
    transform: [{ scale: 1.4 }, { translateX: 10 }, { translateY: 18 }],
  },
  frenchieCardImage: {
    transform: [{ scale: 1.75 }, { translateX: 11 }, { translateY: -1 }],
  },
  germanCardImage: {
    transform: [{ scale: 1.35 }, { translateX: 9 }, { translateY: 7 }],
  },
  goldenCardImage: {
    transform: [{ scale: 1.3 }, { translateX: 10 }, { translateY: 5 }],
  },
  goldenDoodleCardImage: {
    transform: [{ scale: 1.25 }, { translateX: 12 }, { translateY: 6 }],
  },
  huskyCardImage: {
    transform: [{ scale: 1.6 }, { translateX: 5 }, { translateY: 12 }],
  },
  mixedBreedCardImage: {
    transform: [{ scale: 1.25 }, { translateX: 8 }, { translateY: 15 }],
  },
  pugCardImage: {
    transform: [{ scale: 1.21 }, { translateX: 11 }, { translateY: -2 }],
  },
  labCardImage: {
    transform: [{ scale: 1.4 }, { translateX: 7 }, { translateY: 11 }],
  },
  labradoodleCardImage: {
    transform: [{ scale: 1.35 }, { translateX: 8 }, { translateY: 5 }],
  },
  pitbullCardImage: {
    transform: [{ scale: 1.3 }, { translateX: 6 }, { translateY: 4 }],
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 45,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  cardLabel: {
    fontSize: 19,
    lineHeight: 20,
    letterSpacing: 0.4,
    ...Platform.select({
      ios: { fontFamily: 'System', fontWeight: '700' as const },
      android: { fontFamily: 'sans-serif', fontWeight: '700' as const },
      default: {
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        fontWeight: '700' as const,
      },
    }),
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 0.75 },
    textShadowRadius: 1.5,
    color: colors.surface,
    textAlign: 'left',
    width: '100%',
    paddingLeft: 5,
    zIndex: 1,
  },
  germanCardLabel: {
    fontSize: 18,
    lineHeight: 18,
    position: 'relative',
    top: 8,
  },
  goldenDoodleCardLabel: {
    fontSize: 17,
    lineHeight: 18,
    position: 'relative',
    bottom: 1,
  },
  pressed: { opacity: 0.92 },
  comingSoonText: {
    ...typography.bodyMuted,
    textAlign: 'center',
    marginTop: spacing.sm + 2,
    letterSpacing: 0.2,
  },
});
