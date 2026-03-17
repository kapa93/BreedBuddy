import React from 'react';
import { Alert } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteDog } from '@/api/dogs';
import { UserProfileContent } from '@/components/UserProfileContent';
import { useAuthStore } from '@/store/authStore';

type Props = {
  route: { params: { userId: string } };
  navigation: {
    navigate: (screen: string, params?: object) => void;
    getParent?: () => { navigate: (screen: string, params?: object) => void } | undefined;
  };
};

export function UserProfileScreen({ route, navigation }: Props) {
  const viewerUserId = useAuthStore((state) => state.user?.id ?? null);
  const profileUserId = route.params.userId;
  const queryClient = useQueryClient();
  const isOwnProfile = !!viewerUserId && viewerUserId === profileUserId;

  const deleteMutation = useMutation({
    mutationFn: (dogId: string) => {
      if (!viewerUserId) throw new Error('You must be signed in to manage dogs.');
      return deleteDog(dogId, viewerUserId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dogs', profileUserId] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['post'] });
      queryClient.invalidateQueries({ queryKey: ['search'] });
      queryClient.invalidateQueries({ queryKey: ['comments'] });
      queryClient.invalidateQueries({ queryKey: ['userPosts', profileUserId] });
    },
  });

  const handleDeleteDog = (dogId: string, dogName: string) => {
    Alert.alert('Remove dog', `Remove ${dogName} from your profile?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(dogId),
      },
    ]);
  };

  const navigateToProfileTab = (screen?: string, params?: object) => {
    const parent = navigation.getParent?.();
    if (parent) {
      parent.navigate('Profile', screen ? { screen, params } : undefined);
      return;
    }

    if (screen) {
      navigation.navigate(screen, params);
      return;
    }

    navigation.navigate('ProfileMain');
  };

  return (
    <UserProfileContent
      profileUserId={profileUserId}
      viewerUserId={viewerUserId}
      onOpenPost={(postId) => navigation.navigate('PostDetail', { postId })}
      onOpenDogProfile={(dogId) => navigation.navigate('DogProfile', { dogId })}
      onEditProfile={isOwnProfile ? () => navigateToProfileTab('EditProfile') : undefined}
      onAddDog={isOwnProfile ? () => navigateToProfileTab('EditDog', {}) : undefined}
      onEditDog={isOwnProfile ? (dogId) => navigateToProfileTab('EditDog', { dogId }) : undefined}
      onDeleteDog={isOwnProfile ? handleDeleteDog : undefined}
    />
  );
}
