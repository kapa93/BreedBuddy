import React from "react";
import { Image, ImageSourcePropType, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, shadow, spacing, typography } from "../theme";
import type { BreedColorKey } from "../theme";

type Props = {
  label: string;
  image: ImageSourcePropType;
  breedColor: BreedColorKey;
  onPress?: () => void;
};

export function PackCard({ label, image, breedColor, onPress }: Props) {
  const breed = colors.breeds[breedColor];
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}>
      <View style={[styles.card, { backgroundColor: breed.bg, borderColor: breed.ring }]}>
        <Image source={image} style={styles.image} resizeMode="cover" />
        <View style={[styles.labelPill, { borderColor: breed.ring }]}>
          <Text style={[styles.label, { color: breed.text }]}>{label}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", alignItems: "center" },
  pressed: { opacity: 0.92 },
  card: {
    width: "100%",
    aspectRatio: 0.85,
    borderRadius: radius.xl,
    overflow: "hidden",
    borderWidth: 2,
    ...shadow.sm,
  },
  image: { width: "100%", height: "100%" },
  labelPill: {
    position: "absolute",
    bottom: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.sm,
  },
  label: { ...typography.body, fontWeight: "700" },
});
