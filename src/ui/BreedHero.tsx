import React from "react";
import { ImageBackground, ImageSourcePropType, StyleSheet, Text, View, Pressable } from "react-native";
import { colors, radius, spacing, typography } from "../theme";

export function BreedHero({
  title,
  image,
  joined = false,
  onJoinPress,
  onBreedNamePress,
  compact,
}: {
  title: string;
  image: ImageSourcePropType;
  joined?: boolean;
  onJoinPress?: () => void;
  onBreedNamePress?: () => void;
  compact?: boolean;
}) {
  return (
    <ImageBackground source={image} style={[styles.hero, compact && styles.heroCompact]} imageStyle={styles.image}>
      <View style={styles.overlay} />
      <View style={styles.topRow}>
        {onJoinPress && (
          <Pressable
            onPress={onJoinPress}
            style={({ pressed }) => [styles.joinedPill, pressed && styles.joinedPillPressed]}
          >
            <Text style={styles.joinedText}>{joined ? "Joined" : "Join"}</Text>
          </Pressable>
        )}
        {!onJoinPress && (
          <View style={styles.joinedPill}>
            <Text style={styles.joinedText}>{joined ? "Joined" : "Join"}</Text>
          </View>
        )}
      </View>
      {onBreedNamePress ? (
        <Pressable onPress={onBreedNamePress} style={({ pressed }) => [styles.titleWrap, pressed && styles.titlePressed]}>
          <Text style={styles.title}>{title}</Text>
        </Pressable>
      ) : (
        <Text style={styles.title}>{title}</Text>
      )}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  hero: { height: 210, borderRadius: radius.xl, overflow: "hidden", padding: spacing.xl, justifyContent: "space-between", marginBottom: spacing.lg },
  heroCompact: { marginBottom: 0 },
  image: { borderRadius: radius.xl },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  topRow: { flexDirection: "row", justifyContent: "flex-start" },
  joinedPill: { backgroundColor: "rgba(255, 255, 255, 0.88)", borderRadius: radius.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  joinedPillPressed: { opacity: 0.85 },
  joinedText: { fontSize: 15, fontWeight: "700", color: "#2E3834" },
  titleWrap: {},
  titlePressed: { opacity: 0.9 },
  title: { ...typography.titleXL, color: "#FFFFFF", maxWidth: "72%", marginBottom: spacing.xxs },
});
