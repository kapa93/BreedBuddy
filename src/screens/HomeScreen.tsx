import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ScrollView,
  Pressable,
  SafeAreaView,
  Alert,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import { getFeed, deletePost } from "@/api/posts";
import { getDogsByOwner } from "@/api/dogs";
import { getJoinedBreeds, joinBreedFeed, leaveBreedFeed } from "@/api/breedJoins";
import { setReaction } from "@/api/reactions";
import { BreedHero } from "@/ui/BreedHero";
import { SwipeableBreedBanner } from "@/ui/SwipeableBreedBanner";
import { SegmentTabs } from "@/ui/SegmentTabs";
import { QuestionCard } from "@/ui/QuestionCard";
import { postToQuestionCardData } from "@/utils/postToQuestionCard";
import { getBreedHeroImageSource } from "@/utils/breedAssets";
import { BREED_LABELS } from "@/utils/breed";
import { colors, radius, spacing, typography } from "@/theme";
import type { PostWithDetails, ReactionEnum } from "@/types";
import type { FeedFilter } from "@/store/uiStore";

const TABS = ["Newest", "Trending", "Tips", "Questions", "Update/Story"] as const;
type TabKey = (typeof TABS)[number];

const TAB_TO_FILTER: Record<TabKey, FeedFilter> = {
  Newest: "newest",
  Trending: "trending",
  Tips: "TIP",
  Questions: "QUESTION",
  "Update/Story": "UPDATE_STORY",
};

const FILTER_TO_TAB = (f: FeedFilter): TabKey =>
  f === "trending" ? "Trending" : f === "newest" ? "Newest" : f === "TIP" ? "Tips" : f === "QUESTION" ? "Questions" : "Update/Story";

export function HomeScreen({
  navigation,
}: {
  navigation: { navigate: (s: string, p?: object) => void };
}) {
  const { user } = useAuthStore();
  const { feedFilter, setFeedFilter } = useUIStore();
  const queryClient = useQueryClient();
  const [selectedDogIndex, setSelectedDogIndex] = useState(0);
  const [selectedBreedIndex, setSelectedBreedIndex] = useState(0);

  const { data: dogs } = useQuery({
    queryKey: ["dogs", user?.id],
    queryFn: () => getDogsByOwner(user!.id),
    enabled: !!user?.id,
  });

  const { data: joinedBreeds = [] } = useQuery({
    queryKey: ["joinedBreeds", user?.id],
    queryFn: () => getJoinedBreeds(user!.id),
    enabled: !!user?.id,
  });

  const selectedDog = dogs?.[selectedDogIndex];
  const defaultBreed = selectedDog?.breed ?? "GOLDEN_RETRIEVER";
  const breed =
    joinedBreeds.length > 0
      ? joinedBreeds[Math.min(selectedBreedIndex, joinedBreeds.length - 1)] ?? defaultBreed
      : defaultBreed;

  const isJoined = joinedBreeds.includes(breed);

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

  const sort = feedFilter === "trending" ? "trending" : "newest";
  const typeFilter = feedFilter === "QUESTION" || feedFilter === "UPDATE_STORY" || feedFilter === "TIP" ? feedFilter : null;

  const { data: posts, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["feed", breed, feedFilter, user?.id],
    queryFn: () => getFeed(breed, sort, 20, 0, user?.id ?? null, typeFilter),
    enabled: !!user?.id,
  });

  const reactionMutation = useMutation({
    mutationFn: ({ postId, reaction }: { postId: string; reaction: ReactionEnum | null }) =>
      setReaction(postId, user!.id, reaction),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed", breed] });
      queryClient.invalidateQueries({ queryKey: ["post"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (postId: string) => deletePost(postId, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed", breed] });
      queryClient.invalidateQueries({ queryKey: ["post"] });
    },
  });

  const handleEditPost = (postId: string) => {
    navigation.navigate("EditPost", { postId });
  };

  const handleDeletePost = (postId: string) => {
    Alert.alert(
      "Delete post",
      "Are you sure you want to delete this post? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(postId) },
      ]
    );
  };

  const handleReactionSelect = (post: PostWithDetails) => (reaction: ReactionEnum | null) => {
    reactionMutation.mutate({
      postId: post.id,
      reaction,
    });
  };

  const tabKey = FILTER_TO_TAB(feedFilter);

  if (!user) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>Sign in to see your feed</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!dogs || dogs.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>Add a dog profile to see your breed's feed</Text>
          <Text style={styles.link} onPress={() => navigation.navigate("Profile")}>
            Go to Profile
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Text style={styles.emptyEmoji}>🐕</Text>
      <Text style={styles.emptyTitle}>No posts yet in {BREED_LABELS[breed]} community</Text>
      <Text style={styles.emptySub}>Be the first to share!</Text>
      <Text style={styles.link} onPress={() => navigation.navigate("CreatePost", { breed })}>
        Ask a question or share
      </Text>
    </View>
  );

  const renderHeader = () => (
    <>
      {joinedBreeds.length < 1 && dogs.length > 1 && (
        <View style={styles.dogSelector}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dogSelectorScroll}
          >
            {dogs.map((dog, idx) => (
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
      <View style={styles.heroSection}>
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
          title={BREED_LABELS[breed]}
          image={getBreedHeroImageSource(breed)}
          joined={isJoined}
          onJoinPress={handleJoinPress}
          />
        )}
      </View>
      <View style={styles.tabsSection}>
        <SegmentTabs
          tabs={[...TABS]}
          activeTab={tabKey}
          onChange={(t) => setFeedFilter(TAB_TO_FILTER[t])}
        />
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <FlatList
          data={posts ?? []}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          renderItem={({ item }) => (
            <View style={styles.cardWrap}>
              <QuestionCard
                data={postToQuestionCardData(item)}
                onPress={() => navigation.navigate("PostDetail", { postId: item.id })}
                onReactionSelect={handleReactionSelect(item)}
                currentUserId={user?.id}
                onEdit={handleEditPost}
                onDelete={handleDeletePost}
              />
            </View>
          )}
          ListEmptyComponent={!isLoading ? renderEmpty : null}
          refreshControl={
            <RefreshControl
              refreshing={!!isRefetching}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={[
            styles.listContent,
            (!posts || posts.length === 0) && styles.emptyList,
          ]}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
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
  dogChipTextSelected: { color: "#FFFFFF" },
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
  breedChipTextSelected: { color: "#FFFFFF" },
  heroSection: { paddingHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.sm },
  tabsSection: { paddingHorizontal: spacing.lg, marginTop: -spacing.xs, marginBottom: spacing.sm },
  cardWrap: { paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  listContent: { paddingBottom: spacing.xxxl },
});
