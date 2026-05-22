import { Alert } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  addDogSpotVibe,
  getDogSpotVibeOptions,
  getDogSpotVibes,
  getDogSpotVibesForPlaces,
  removeDogSpotVibe,
} from '@/api/dogSpotVibes';
import type { VibeVote, VibeVoteWithPlace } from '@/api/dogSpotVibes';
import { useAuthStore } from '@/store/authStore';

export type VibeOptionWithCount = {
  id: string;
  key: string;
  label: string;
  icon: string | null;
  count: number;
  selectedByCurrentUser: boolean;
};

export function useDogSpotVibes(googlePlaceId: string) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [togglingOptionId, setTogglingOptionId] = useState<string | null>(null);

  const optionsQuery = useQuery({
    queryKey: ['dogSpotVibeOptions'],
    queryFn: getDogSpotVibeOptions,
    staleTime: 5 * 60_000,
  });

  const vibesQuery = useQuery({
    queryKey: ['dogSpotVibes', googlePlaceId],
    queryFn: () => getDogSpotVibes(googlePlaceId),
    enabled: !!googlePlaceId,
  });

  const options = optionsQuery.data ?? [];
  const votes   = vibesQuery.data ?? [];

  // Aggregate votes client-side.
  const countsByOption = new Map<string, number>();
  const selectedByUser = new Set<string>();
  for (const vote of votes) {
    countsByOption.set(vote.vibe_option_id, (countsByOption.get(vote.vibe_option_id) ?? 0) + 1);
    if (user && vote.user_id === user.id) {
      selectedByUser.add(vote.vibe_option_id);
    }
  }

  const vibeOptionsWithCounts: VibeOptionWithCount[] = options.map((opt) => ({
    id: opt.id,
    key: opt.key,
    label: opt.label,
    icon: opt.icon,
    count: countsByOption.get(opt.id) ?? 0,
    selectedByCurrentUser: selectedByUser.has(opt.id),
  }));

  const uniqueVoterCount = new Set(votes.map((v) => v.user_id)).size;

  const toggleMutation = useMutation({
    mutationFn: async (optionId: string) => {
      if (!user) throw new Error('unauthenticated');
      const isSelected = selectedByUser.has(optionId);
      if (isSelected) {
        await removeDogSpotVibe(googlePlaceId, optionId, user.id);
      } else {
        await addDogSpotVibe(googlePlaceId, optionId, user.id);
      }
      return { optionId, wasSelected: isSelected };
    },
    onMutate: async (optionId: string) => {
      setTogglingOptionId(optionId);

      // Cancel in-flight refetches so they don't overwrite our optimistic state.
      await queryClient.cancelQueries({ queryKey: ['dogSpotVibes', googlePlaceId] });

      const previous = queryClient.getQueryData<VibeVote[]>(['dogSpotVibes', googlePlaceId]);
      if (!user) return { previous };

      const isSelected = selectedByUser.has(optionId);
      queryClient.setQueryData<VibeVote[]>(['dogSpotVibes', googlePlaceId], (old = []) => {
        if (isSelected) {
          return old.filter(
            (v) => !(v.vibe_option_id === optionId && v.user_id === user.id),
          );
        }
        return [...old, { vibe_option_id: optionId, user_id: user.id }];
      });

      return { previous };
    },
    onError: (_err, _optionId, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(['dogSpotVibes', googlePlaceId], context.previous);
      }
      Alert.alert('Couldn\'t update vibe', 'Please try again in a moment.');
    },
    onSettled: () => {
      setTogglingOptionId(null);
      queryClient.invalidateQueries({ queryKey: ['dogSpotVibes', googlePlaceId] });
      queryClient.invalidateQueries({ queryKey: ['dogSpotVibesMulti'] });
    },
  });

  const toggleVibe = (optionId: string) => {
    if (!user) {
      Alert.alert('Sign in required', 'Sign in to add your dog vibe.');
      return;
    }
    if (togglingOptionId) return; // debounce rapid taps
    toggleMutation.mutate(optionId);
  };

  return {
    vibeOptionsWithCounts,
    uniqueVoterCount,
    selectedVibeOptionIds: selectedByUser,
    isLoading: optionsQuery.isLoading || vibesQuery.isLoading,
    error: optionsQuery.error ?? vibesQuery.error,
    toggleVibe,
    togglingOptionId,
  };
}

// ── List-level hook (batch fetch for explore screen) ──────────────────────────

export type PlaceVibeData = {
  vibesWithCounts: VibeOptionWithCount[];
  uniqueVoterCount: number;
};

export function useListDogSpotVibes(googlePlaceIds: string[]): {
  vibesByPlace: Map<string, PlaceVibeData>;
  isLoading: boolean;
} {
  const idsKey = googlePlaceIds.slice().sort().join('|');

  const optionsQuery = useQuery({
    queryKey: ['dogSpotVibeOptions'],
    queryFn: getDogSpotVibeOptions,
    staleTime: 5 * 60_000,
  });

  const vibesQuery = useQuery({
    queryKey: ['dogSpotVibesMulti', idsKey],
    queryFn: () => getDogSpotVibesForPlaces(googlePlaceIds),
    enabled: googlePlaceIds.length > 0,
    staleTime: 5 * 60_000,
  });

  const vibesByPlace = useMemo<Map<string, PlaceVibeData>>(() => {
    const options = optionsQuery.data ?? [];
    const votes   = vibesQuery.data ?? [];

    const votesByPlaceId = new Map<string, VibeVoteWithPlace[]>();
    for (const vote of votes) {
      const arr = votesByPlaceId.get(vote.google_place_id) ?? [];
      arr.push(vote);
      votesByPlaceId.set(vote.google_place_id, arr);
    }

    const result = new Map<string, PlaceVibeData>();
    for (const placeId of googlePlaceIds) {
      const placeVotes     = votesByPlaceId.get(placeId) ?? [];
      const countsByOption = new Map<string, number>();
      const uniqueVoters   = new Set<string>();
      for (const vote of placeVotes) {
        countsByOption.set(vote.vibe_option_id, (countsByOption.get(vote.vibe_option_id) ?? 0) + 1);
        uniqueVoters.add(vote.user_id);
      }
      const vibesWithCounts = options
        .filter((o) => (countsByOption.get(o.id) ?? 0) > 0)
        .sort((a, b) => (countsByOption.get(b.id) ?? 0) - (countsByOption.get(a.id) ?? 0))
        .map((o) => ({
          id: o.id,
          key: o.key,
          label: o.label,
          icon: o.icon,
          count: countsByOption.get(o.id) ?? 0,
          selectedByCurrentUser: false,
        }));
      result.set(placeId, { vibesWithCounts, uniqueVoterCount: uniqueVoters.size });
    }
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionsQuery.data, vibesQuery.data, idsKey]);

  return {
    vibesByPlace,
    isLoading: optionsQuery.isLoading || (googlePlaceIds.length > 0 && vibesQuery.isLoading),
  };
}
