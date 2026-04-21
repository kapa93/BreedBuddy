import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  Pressable,
  ImageBackground,
  Platform,
  TextInput,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { getPackItems } from "@/utils/breedAssets";
import { useStackHeaderHeight } from "@/hooks/useStackHeaderHeight";
import { listActivePlaces } from "@/api/places";
import { PlaceRow } from "@/components/PlaceRow";
import { useSavedPlaces, useToggleSavedPlace, useSavedPlacesWithActivity } from "@/hooks/useSavedPlaces";
import { useAuthStore } from "@/store/authStore";
import { MyPlacesSheet } from "@/components/MyPlacesSheet";
import { colors, radius, spacing, typography } from "@/theme";

const CARD_GAP = spacing.md;
const H_PADDING = spacing.lg;
const NUM_COLUMNS = 2;
const TABS_SEARCH_ANIM_DURATION = 220;
const TABS_SEARCH_ESTIMATED_HEIGHT = 118;
// Slide farther than the overlay's own height so the content is fully off-screen
// before the fade completes — gives a more prominent slide and softer fade, matching
// the HomeScreen stack header animation.
const TABS_SEARCH_HIDE_OVERSHOOT = 40;
const SCROLL_DIRECTION_THRESHOLD = 3;
const AT_TOP_THRESHOLD = 10;
const AT_BOTTOM_THRESHOLD = 10;

type LocalScrollDirection = "up" | "down";

type Tab = "breeds" | "places";

export function ExploreScreen({
  navigation,
  route,
}: {
  navigation: {
    navigate: (s: string, p?: object) => void;
    setOptions: (opts: object) => void;
  };
  route: { params?: { initialTab?: Tab } };
}) {
  const { user } = useAuthStore();
  const { width } = useWindowDimensions();
  const headerHeight = useStackHeaderHeight();
  const cardWidth = (width - H_PADDING * 2 - CARD_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;
  const packItems = getPackItems();
  const [activeTab, setActiveTab] = useState<Tab>(route.params?.initialTab ?? "breeds");
  const [searchQuery, setSearchQuery] = useState("");
  const [myPlacesOpen, setMyPlacesOpen] = useState(false);
  const [tabsSearchHeight, setTabsSearchHeight] = useState(TABS_SEARCH_ESTIMATED_HEIGHT);
  const [scrollDirection, setScrollDirection] = useState<LocalScrollDirection>("up");
  const lastOffsetRef = useRef(0);
  const tabsSearchTranslate = useSharedValue(0);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const y = contentOffset.y;
      const diff = y - lastOffsetRef.current;
      lastOffsetRef.current = y;
      if (Math.abs(diff) < SCROLL_DIRECTION_THRESHOLD) return;
      if (y < AT_TOP_THRESHOLD && diff > 0) return;
      const atBottom =
        y + layoutMeasurement.height >= contentSize.height - AT_BOTTOM_THRESHOLD;
      if (atBottom && diff < 0) return;
      setScrollDirection(diff > 0 ? "down" : "up");
    },
    []
  );

  const hideOffset = tabsSearchHeight + TABS_SEARCH_HIDE_OVERSHOOT;

  useEffect(() => {
    const shouldHide = scrollDirection === "down";
    tabsSearchTranslate.value = withTiming(shouldHide ? -hideOffset : 0, {
      duration: TABS_SEARCH_ANIM_DURATION,
    });
  }, [scrollDirection, hideOffset, tabsSearchTranslate]);

  const tabsSearchAnimatedStyle = useAnimatedStyle(() => {
    // Piecewise curve: stay near-opaque while the overlay is still visually on-screen,
    // then fall off quickly during the off-screen overshoot. This keeps the slide feeling
    // like the dominant motion and the fade very subtle.
    const opacity = interpolate(
      tabsSearchTranslate.value,
      [-hideOffset, -tabsSearchHeight, 0],
      [0, 0.75, 1]
    );
    return {
      opacity,
      transform: [{ translateY: tabsSearchTranslate.value }],
    };
  });

  const handleTabsSearchLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0 && Math.abs(h - tabsSearchHeight) > 0.5) {
      setTabsSearchHeight(h);
    }
  };

  const handleTabChange = (tab: Tab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setSearchQuery("");
  };
  const { savedPlaces, dogCounts, isLoading: savedPlacesLoading } = useSavedPlacesWithActivity(user?.id);

  React.useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <Text style={styles.headerTitleText}>Explore</Text>
      ),
      headerLeft: () => (
        <Pressable
          onPress={() => setMyPlacesOpen(true)}
          style={({ pressed }) => [styles.myPlacesChip, pressed && styles.myPlacesChipPressed]}
          accessibilityRole="button"
          accessibilityLabel="My Places"
        >
          <Ionicons name="compass-outline" size={26} color={colors.primaryDark} />
        </Pressable>
      ),
    });
  }, [navigation]);

  const { data: places = [] } = useQuery({
    queryKey: ["places"],
    queryFn: listActivePlaces,
    enabled: !!user?.id,
  });

  const { savedPlaceIds } = useSavedPlaces(user?.id);
  const toggleSave = useToggleSavedPlace();

  const sortedPlaces = [
    ...places.filter((p) => savedPlaceIds.has(p.id)),
    ...places.filter((p) => !savedPlaceIds.has(p.id)),
  ];

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredPackItems = useMemo(() => {
    if (!normalizedQuery) return packItems;
    return packItems.filter((item) =>
      item.label.toLowerCase().includes(normalizedQuery)
    );
  }, [packItems, normalizedQuery]);

  const filteredPlaces = useMemo(() => {
    if (!normalizedQuery) return sortedPlaces;
    return sortedPlaces.filter((place) => {
      const haystack = [place.name, place.neighborhood, place.city]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [sortedPlaces, normalizedQuery]);

  const scrollChromePadding = headerHeight + tabsSearchHeight;

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safe} edges={["left", "right"]}>
        {/* Breeds tab */}
        {activeTab === "breeds" && (
          <ScrollView
            style={styles.container}
            contentContainerStyle={[
              styles.breedsContent,
              { paddingTop: scrollChromePadding + spacing.xl - 5 },
            ]}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            <View style={styles.gridWrap}>
              <View style={styles.grid}>
                {filteredPackItems.map((item) => (
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
            {filteredPackItems.length === 0 ? (
              <Text style={styles.emptyStateText}>No breeds match “{searchQuery.trim()}”</Text>
            ) : (
              <Text style={styles.comingSoonText}>More breeds coming soon!</Text>
            )}
          </ScrollView>
        )}

        {/* Places tab */}
        {activeTab === "places" && (
          <ScrollView
            style={styles.container}
            contentContainerStyle={[
              styles.placesContent,
              { paddingTop: scrollChromePadding + spacing.xl - 5 },
            ]}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {filteredPlaces.length === 0 ? (
              <Text style={styles.placesEmptyText}>
                {normalizedQuery
                  ? `No places match “${searchQuery.trim()}”`
                  : "No places yet — check back soon!"}
              </Text>
            ) : (
              filteredPlaces.map((place) => (
                <PlaceRow
                  key={place.id}
                  place={place}
                  isSaved={savedPlaceIds.has(place.id)}
                  onPress={() => navigation.navigate("PlaceDetail", { placeId: place.id })}
                  onSaveToggle={() =>
                    toggleSave.mutate({ placeId: place.id, isSaved: savedPlaceIds.has(place.id) })
                  }
                  saveLoading={toggleSave.isPending}
                />
              ))
            )}
          </ScrollView>
        )}

        {/* Tabs + search overlay (hides on scroll down, shows on scroll up) */}
        <Animated.View
          style={[
            styles.tabsSearchOverlay,
            { top: headerHeight },
            tabsSearchAnimatedStyle,
          ]}
          onLayout={handleTabsSearchLayout}
        >
          <View style={styles.tabBar}>
            <Pressable
              style={[styles.tab, activeTab === "breeds" && styles.tabActive]}
              onPress={() => handleTabChange("breeds")}
            >
              <Text style={[styles.tabText, activeTab === "breeds" && styles.tabTextActive]}>
                Breeds
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tab, activeTab === "places" && styles.tabActive]}
              onPress={() => handleTabChange("places")}
            >
              <Text style={[styles.tabText, activeTab === "places" && styles.tabTextActive]}>
                Places
              </Text>
            </Pressable>
          </View>
          <View style={styles.searchWrap}>
            <View style={styles.searchRow}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder={activeTab === "breeds" ? "Search breeds" : "Search places"}
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="default"
                clearButtonMode="while-editing"
              />
              {searchQuery.length > 0 && Platform.OS !== "ios" ? (
                <Pressable
                  onPress={() => setSearchQuery("")}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                >
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </View>
          </View>
        </Animated.View>
      </SafeAreaView>
      <MyPlacesSheet
        visible={myPlacesOpen}
        onClose={() => setMyPlacesOpen(false)}
        places={savedPlaces}
        dogCounts={dogCounts}
        isLoading={savedPlacesLoading}
        onPlacePress={(place) => {
          navigation.navigate('PlaceDetail', { placeId: place.id });
        }}
        onCreateMeetupPress={(place) => {
          navigation.navigate('CreatePost', {
            initialType: 'MEETUP',
            initialPlaceId: place.id,
            initialPlaceName: place.name,
          });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  safe: { flex: 1 },
  container: { flex: 1 },
  myPlacesChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  myPlacesChipPressed: { opacity: 0.5 },

  header: {
    backgroundColor: colors.surface,
  },
  tabsSearchOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    zIndex: 5,
  },
  headerTitleText: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    lineHeight: 30,
    color: colors.textPrimary,
    position: "relative",
    top: -2,
  },
  // Tab bar
  tabBar: {
    flexDirection: "row",
    width: "100%",
    paddingHorizontal: H_PADDING,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginTop: spacing.md,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    marginBottom: -1.5,
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    ...typography.body,
    fontFamily: "Inter_400Regular",
    color: colors.textMuted,
  },
  tabTextActive: {
    fontFamily: "Inter_700Bold",
    color: colors.primary,
  },

  // Search
  searchWrap: {
    paddingHorizontal: H_PADDING,
    paddingTop: spacing.md,
    paddingBottom: 10,
  },
  searchRow: {
    height: 42,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm + 2,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceMuted,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    lineHeight: 19,
    color: colors.textPrimary,
    paddingVertical: 0,
    paddingTop: Platform.OS === "ios" ? 1 : 0,
    paddingBottom: Platform.OS === "ios" ? 2 : 0,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  emptyStateText: {
    ...typography.bodyMuted,
    textAlign: "center",
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
  },

  // Breeds tab
  breedsContent: {
    paddingHorizontal: H_PADDING,
    paddingTop: spacing.xl + 5,
    paddingBottom: spacing.xxxl + 75,
  },
  gridWrap: {
    alignItems: "center",
    marginLeft: 10,
  },
  comingSoonText: {
    ...typography.bodyMuted,
    textAlign: "center",
    marginTop: spacing.sm + 2,
    letterSpacing: 0.2,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -CARD_GAP / 2,
  },
  cell: {
    paddingHorizontal: CARD_GAP / 2,
    marginBottom: spacing.lg,
  },
  card: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: radius.xl,
    overflow: "hidden",
    justifyContent: "flex-end",
    padding: spacing.md,
  },
  cardShadow: {
    borderRadius: radius.xl,
    shadowColor: "#000",
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
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 45,
    backgroundColor: "rgba(0, 0, 0, 0.25)",
  },
  cardLabel: {
    fontSize: 19,
    lineHeight: 20,
    letterSpacing: 0.4,
    ...Platform.select({
      ios: { fontFamily: "System", fontWeight: "700" as const },
      android: { fontFamily: "sans-serif", fontWeight: "700" as const },
      default: {
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        fontWeight: "700" as const,
      },
    }),
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 0.75 },
    textShadowRadius: 1.5,
    color: colors.surface,
    textAlign: "left",
    width: "100%",
    paddingLeft: 5,
    zIndex: 1,
  },
  germanCardLabel: {
    fontSize: 18,
    lineHeight: 18,
    position: "relative",
    top: 8,
  },
  goldenDoodleCardLabel: {
    fontSize: 17,
    lineHeight: 18,
    position: "relative",
    bottom: 1,
  },
  pressed: { opacity: 0.92 },

  // Places tab
  placesContent: {
    paddingHorizontal: H_PADDING,
    paddingTop: spacing.xl + 5,
    paddingBottom: spacing.xxxl + 75,
    gap: spacing.sm,
  },
  placesEmptyText: {
    ...typography.bodyMuted,
    textAlign: "center",
    marginTop: spacing.xl,
  },
});
