import React, { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  FlatList,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadow, spacing, typography } from '@/theme';
import type { Place, PlaceTypeEnum } from '@/types';

const PLACE_TYPE_LABELS: Record<PlaceTypeEnum, string> = {
  dog_beach: 'Dog Beach',
  dog_park: 'Dog Park',
  trail: 'Trail',
  park: 'Park',
  other: 'Place',
};

type Props = {
  visible: boolean;
  onClose: () => void;
  places: Place[];
  /** placeId → number of active dog check-ins right now */
  dogCounts: Record<string, number>;
  isLoading: boolean;
  onPlacePress: (place: Place) => void;
  /** Optional: called when user taps the "create meetup" icon on a row */
  onCreateMeetupPress?: (place: Place) => void;
  /** Called when user taps "Add more places" footer */
  onAddMorePress?: () => void;
};

export function MyPlacesSheet({
  visible,
  onClose,
  places,
  dogCounts,
  isLoading,
  onPlacePress,
  onCreateMeetupPress,
  onAddMorePress,
}: Props) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(500)).current;

  const startSlideOut = useCallback(
    (onDone?: () => void) => {
      Animated.timing(slideAnim, {
        toValue: 500,
        duration: 220,
        useNativeDriver: true,
      }).start(onDone);
    },
    [slideAnim]
  );

  const handleModalShow = useCallback(() => {
    slideAnim.setValue(500);
    Animated.spring(slideAnim, {
      toValue: 0,
      damping: 22,
      stiffness: 220,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  const handleClose = useCallback(() => {
    startSlideOut(onClose);
  }, [startSlideOut, onClose]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 5,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) slideAnim.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 80 || gs.vy > 0.5) {
          startSlideOut(onClose);
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            damping: 22,
            stiffness: 220,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const handlePlacePress = useCallback(
    (place: Place) => {
      onPlacePress(place);
      startSlideOut(onClose);
    },
    [onPlacePress, startSlideOut, onClose]
  );

  const handleCreateMeetupPress = useCallback(
    (place: Place) => {
      startSlideOut(() => {
        onClose();
        onCreateMeetupPress?.(place);
      });
    },
    [onCreateMeetupPress, startSlideOut, onClose]
  );

  useEffect(() => {
    if (!visible) {
      slideAnim.setValue(500);
    }
  }, [visible, slideAnim]);

  const renderPlace = useCallback(
    ({ item }: { item: Place }) => {
      const count = dogCounts[item.id] ?? 0;
      const subtitle = [
        PLACE_TYPE_LABELS[item.place_type],
        [item.neighborhood, item.city].filter(Boolean).join(', '),
      ]
        .filter(Boolean)
        .join(' · ');

      return (
        <Pressable
          onPress={() => handlePlacePress(item)}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          accessibilityRole="button"
          accessibilityLabel={item.name}
        >
          <View style={styles.rowBody}>
            <Text style={styles.placeName} numberOfLines={1}>
              {item.name}
            </Text>
            {subtitle ? (
              <Text style={styles.placeSubtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>

          <View
            style={[styles.countPill, count > 0 && styles.countPillActive]}
            accessibilityLabel={`${count} dogs`}
          >
            <Ionicons
              name="paw"
              size={12}
              color={count > 0 ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.countText, count > 0 && styles.countTextActive]}>
              {count}
            </Text>
          </View>

          {onCreateMeetupPress ? (
            <Pressable
              onPress={() => handleCreateMeetupPress(item)}
              hitSlop={8}
              style={({ pressed }) => [styles.meetupBtn, pressed && styles.meetupBtnPressed]}
              accessibilityRole="button"
              accessibilityLabel={`Create meetup at ${item.name}`}
            >
              <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
            </Pressable>
          ) : null}
        </Pressable>
      );
    },
    [dogCounts, handlePlacePress, handleCreateMeetupPress, onCreateMeetupPress]
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onShow={handleModalShow}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={handleClose}
          accessibilityLabel="Close My Places"
        />

        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, spacing.lg) },
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Drag handle */}
          <View style={styles.handleArea} {...panResponder.panHandlers}>
            <View style={styles.handle} />
          </View>

          {/* Sheet header */}
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>My Places</Text>
          </View>

          {/* Content */}
          {isLoading ? (
            <View style={styles.stateBox}>
              <Text style={styles.helperText}>Loading…</Text>
            </View>
          ) : places.length === 0 ? (
            <View style={styles.stateBox}>
              <Ionicons name="bookmark-outline" size={36} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No saved places yet</Text>
              <Text style={styles.emptyBody}>
                Browse places in Explore to save the spots you love.
              </Text>
            </View>
          ) : (
            <>
              <FlatList
                data={places}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                renderItem={renderPlace}
                showsVerticalScrollIndicator={false}
              />
              {onAddMorePress ? (
                <Pressable
                  onPress={() => { startSlideOut(() => { onClose(); onAddMorePress(); }); }}
                  style={({ pressed }) => [styles.addMoreBtn, pressed && styles.addMoreBtnPressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Add more places"
                >
                  <Text style={styles.addMoreText}>Add more places</Text>
                </Pressable>
              ) : null}
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: spacing.sm,
    minHeight: '30%',
    maxHeight: '75%',
    ...shadow.md,
  },
  handleArea: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 37,
    height: 2,
    borderRadius: 2,
    backgroundColor: 'rgba(60, 60, 67, 0.75)',
    marginBottom: 11,
    transform: [{ translateY: -2 }],
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginTop: -3,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(231, 226, 216, 0.5)',
  },
  sheetTitle: {
    ...typography.subtitle,
    fontFamily: 'Inter_700Bold',
    transform: [{ translateY: -11 }],
  },
  list: {
    paddingTop: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(231, 226, 216, 0.5)',
  },
  rowPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  rowBody: {
    flex: 1,
    gap: spacing.xxs,
  },
  placeName: {
    ...typography.subtitle,
  },
  placeSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
  },
  countPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    minWidth: 40,
    justifyContent: 'center',
    flexShrink: 0,
  },
  countPillActive: {
    backgroundColor: colors.primarySoft,
  },
  countText: {
    ...typography.caption,
    color: colors.textMuted,
    fontFamily: 'Inter_700Bold',
  },
  countTextActive: {
    color: colors.primary,
  },
  stateBox: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xxl,
    gap: spacing.md,
  },
  helperText: {
    ...typography.bodyMuted,
  },
  emptyTitle: {
    ...typography.subtitle,
    textAlign: 'center',
  },
  emptyBody: {
    ...typography.bodyMuted,
    textAlign: 'center',
  },
  addMoreBtn: {
    alignSelf: 'center',
    marginVertical: spacing.md,
    transform: [{ translateY: 2 }],
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  addMoreBtnPressed: {
    backgroundColor: colors.primarySoft,
  },
  addMoreText: {
    ...typography.caption,
    color: colors.primary,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  meetupBtn: {
    padding: spacing.xs,
    borderRadius: radius.sm,
    flexShrink: 0,
  },
  meetupBtnPressed: {
    opacity: 0.6,
  },
});
