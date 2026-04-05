import React, { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '@/api/notifications';
import { useAuthStore } from '@/store/authStore';
import { ScreenWithWallpaper } from '@/components/ScreenWithWallpaper';
import { useScrollDirection, useScrollDirectionUpdater } from '@/context/ScrollDirectionContext';
import { useStackHeaderHeight } from '@/hooks/useStackHeaderHeight';
import { formatRelativeTime } from '@/utils/breed';
import { spacing, typography } from '@/theme';

type NotificationItem = {
  id: string;
  type: string;
  actor_name?: string;
  post_id: string;
  content_preview?: string;
  created_at: string;
  read_at: string | null;
};

export function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const tabBarHeight = useBottomTabBarHeight();
  const headerHeight = useStackHeaderHeight();
  const { scrollDirection, setScrollDirection } = useScrollDirection();
  const { onScroll } = useScrollDirectionUpdater();

  useEffect(() => {
    setScrollDirection('up');
  }, [setScrollDirection]);

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => getNotifications(user!.id),
    enabled: !!user?.id,
  });

  const markReadMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => markNotificationRead(id, user!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(user!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] }),
  });

  const items: NotificationItem[] = (notifications ?? []).map((n: { id: string; type: string; actor?: { name?: string }; post_id: string; post?: { content_text?: string }; created_at: string; read_at: string | null }) => ({
    id: n.id,
    type: n.type,
    actor_name: n.actor?.name,
    post_id: n.post_id,
    content_preview: n.post?.content_text?.slice(0, 50),
    created_at: n.created_at,
    read_at: n.read_at,
  }));

  const unreadCount = items.filter((i) => !i.read_at).length;

  if (!user) {
    return (
      <ScreenWithWallpaper>
        <SafeAreaView style={styles.safe} edges={['left', 'right']}>
          <View style={[styles.container, { paddingTop: headerHeight }]}>
            <View style={styles.centered}>
              <Text style={styles.emptyText}>Sign in to see notifications</Text>
            </View>
          </View>
        </SafeAreaView>
      </ScreenWithWallpaper>
    );
  }

  if (isLoading) {
    return (
      <ScreenWithWallpaper>
        <SafeAreaView style={styles.safe} edges={['left', 'right']}>
          <View style={[styles.container, { paddingTop: headerHeight }]}>
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#6366f1" />
            </View>
          </View>
        </SafeAreaView>
      </ScreenWithWallpaper>
    );
  }

  return (
    <ScreenWithWallpaper>
      <SafeAreaView style={styles.safe} edges={['left', 'right']}>
        <View style={[styles.container, { paddingTop: headerHeight }]}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {items.length === 0 ? (
            <View style={styles.centered}>
              <Text style={styles.emptyText}>No notifications yet</Text>
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={(i) => i.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.item, !item.read_at && styles.itemUnread]}
                  onPress={() => {
                    if (!item.read_at) markReadMutation.mutate({ id: item.id });
                    navigation.navigate('PostDetail', { postId: item.post_id });
                  }}
                >
                  <Text style={styles.itemText}>
                    <Text style={styles.actorName}>{item.actor_name ?? 'Someone'}</Text>
                    {item.type === 'COMMENT' ? ' commented on your post' : ' reacted to your post'}
                  </Text>
                  {item.content_preview ? (
                    <Text style={styles.preview} numberOfLines={1}>
                      "{item.content_preview}..."
                    </Text>
                  ) : null}
                  <Text style={styles.time}>{formatRelativeTime(item.created_at)}</Text>
                </TouchableOpacity>
              )}
              ListHeaderComponent={
                <View style={styles.listHeader}>
                  {unreadCount > 0 ? (
                    <TouchableOpacity
                      style={styles.markAllBtn}
                      onPress={() => markAllReadMutation.mutate()}
                      disabled={markAllReadMutation.isPending}
                    >
                      <Text style={styles.markAllText}>Mark all as read</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              }
              contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + 24 }]}
              onScroll={onScroll}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </SafeAreaView>
    </ScreenWithWallpaper>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, paddingTop: 8 },
  headerTitle: {
    ...typography.titleXL,
    fontSize: 26,
    lineHeight: 30,
    alignSelf: 'flex-start',
    marginLeft: 20,
    marginBottom: spacing.xs,
    marginTop: 35,
    color: '#111827',
  },
  listHeader: { minHeight: 18, justifyContent: 'center' },
  markAllBtn: { paddingHorizontal: 16, paddingVertical: 4, alignItems: 'flex-end' },
  markAllText: { color: '#6366f1', fontWeight: '600', fontSize: 14 },
  list: { paddingTop: 0 },
  item: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
  },
  itemUnread: { backgroundColor: '#eef2ff' },
  itemText: { fontSize: 15, color: '#374151' },
  actorName: { fontWeight: '600' },
  preview: { fontSize: 13, color: '#6b7280', marginTop: 4, fontStyle: 'italic' },
  time: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#6b7280' },
});
