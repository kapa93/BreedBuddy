import { useQuery } from '@tanstack/react-query';
import { getProfile } from '@/api/auth';
import { getJoinedBreeds } from '@/api/breedJoins';
import { getDogsByOwner } from '@/api/dogs';
import { getRecentPostsByAuthor } from '@/api/posts';

type UseUserProfileOptions = {
  profileUserId: string;
  viewerUserId?: string | null;
  recentPostsLimit?: number;
  includeJoinedBreeds?: boolean;
};

export function useUserProfile({
  profileUserId,
  viewerUserId,
  recentPostsLimit = 4,
  includeJoinedBreeds = false,
}: UseUserProfileOptions) {
  const isOwnProfile = !!viewerUserId && viewerUserId === profileUserId;
  const shouldLoad = !!profileUserId;

  const profileQuery = useQuery({
    queryKey: ['profile', profileUserId],
    queryFn: () => getProfile(profileUserId),
    enabled: shouldLoad,
  });

  const dogsQuery = useQuery({
    queryKey: ['dogs', profileUserId],
    queryFn: () => getDogsByOwner(profileUserId),
    enabled: shouldLoad,
  });

  const postsQuery = useQuery({
    queryKey: ['userPosts', profileUserId, viewerUserId ?? null, recentPostsLimit],
    queryFn: () => getRecentPostsByAuthor(profileUserId, recentPostsLimit, viewerUserId ?? null),
    enabled: shouldLoad,
  });

  const joinedBreedsQuery = useQuery({
    queryKey: ['joinedBreeds', profileUserId],
    queryFn: () => getJoinedBreeds(profileUserId),
    enabled: shouldLoad && includeJoinedBreeds && isOwnProfile,
  });

  return {
    isOwnProfile,
    profileQuery,
    dogsQuery,
    postsQuery,
    joinedBreedsQuery,
    profile: profileQuery.data ?? null,
    dogs: dogsQuery.data ?? [],
    posts: postsQuery.data ?? [],
    joinedBreeds: joinedBreedsQuery.data ?? [],
    profileLoading: profileQuery.isLoading,
    dogsLoading: dogsQuery.isLoading,
    postsLoading: postsQuery.isLoading,
    joinedBreedsLoading: joinedBreedsQuery.isLoading,
    isLoading:
      profileQuery.isLoading ||
      dogsQuery.isLoading ||
      postsQuery.isLoading ||
      joinedBreedsQuery.isLoading,
    error:
      profileQuery.error ??
      dogsQuery.error ??
      postsQuery.error ??
      joinedBreedsQuery.error ??
      null,
    refetchAll: () =>
      Promise.all([
        profileQuery.refetch(),
        dogsQuery.refetch(),
        postsQuery.refetch(),
        ...(includeJoinedBreeds && isOwnProfile ? [joinedBreedsQuery.refetch()] : []),
      ]),
  };
}
