import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { colors, radius, spacing, typography } from "../theme";

export function ReactionPill({ emoji, label, onPress, variant = "filled" }: { emoji: string; label: string; onPress?: () => void; variant?: "filled" | "outline" }) {
  return (
    <Pressable onPress={onPress} style={[styles.base, variant === "filled" ? styles.filled : styles.outline]}>
      <Text style={styles.text}>{emoji} {label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginRight: spacing.sm },
  filled: { backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border },
  outline: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  text: { ...typography.bodyMuted, fontWeight: "700" },
});
