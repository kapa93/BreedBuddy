import React, { useEffect } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { colors, radius, spacing, typography } from "../theme";

const TAB_ANIMATION = { duration: 140 };
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function SegmentTabItem({
  tab,
  active,
  isLast,
  onPress,
}: {
  tab: string;
  active: boolean;
  isLast: boolean;
  onPress: () => void;
}) {
  const activeProgress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    activeProgress.value = withTiming(active ? 1 : 0, TAB_ANIMATION);
  }, [active, activeProgress]);

  const tabAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      activeProgress.value,
      [0, 1],
      [colors.surface, colors.primary]
    ),
  }));

  const labelAnimatedStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      activeProgress.value,
      [0, 1],
      [colors.textSecondary, "#FFFFFF"]
    ),
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      style={[
        styles.tab,
        !isLast && styles.tabGap,
        active && styles.tabActive,
        tabAnimatedStyle,
      ]}
    >
      <Animated.Text style={[styles.label, labelAnimatedStyle]}>{tab}</Animated.Text>
    </AnimatedPressable>
  );
}

export function SegmentTabs({ tabs, activeTab, onChange }: { tabs: string[]; activeTab: string; onChange: (tab: string) => void }) {
  return (
    <View style={styles.barWrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.row}
      >
        {tabs.map((tab, i) => {
          const active = tab === activeTab;
          const isLast = i === tabs.length - 1;
          return (
            <SegmentTabItem
              key={tab}
              tab={tab}
              active={active}
              isLast={isLast}
              onPress={() => onChange(tab)}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  barWrap: {
    backgroundColor: colors.background,
    zIndex: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  scroll: {
    backgroundColor: "transparent",
  },
  row: {
    paddingTop: spacing.sm + 5,
    paddingBottom: spacing.sm + 5,
    paddingHorizontal: spacing.lg,
  },
  tab: {
    backgroundColor: colors.surface,
    borderRadius: radius.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
    elevation: 1,
  },
  tabGap: { marginRight: spacing.sm },
  tabActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 2,
  },
  label: {
    ...typography.caption,
    fontSize: 14,
    lineHeight: 19,
    ...(Platform.OS === "web"
      ? { fontFamily: "'Inter', sans-serif", fontWeight: "600" as const }
      : { fontFamily: "Inter_600SemiBold" as const }),
  },
});
