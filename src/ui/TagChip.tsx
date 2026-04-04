import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "../theme";

type Tone = "neutral" | "question" | "tip" | "story";

const toneStyles: Record<Tone, { bg: string; text: string }> = {
  neutral: { bg: colors.chipNeutral, text: colors.chipText },
  question: { bg: "#F9E5B3", text: "#7A5A12" },
  tip: { bg: colors.primarySoft, text: colors.primaryDark },
  story: { bg: "#EEE8FF", text: "#57418A" },
};

export function TagChip({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  return (
    <View style={[styles.chip, { backgroundColor: toneStyles[tone].bg }]}>
      <Text style={[styles.label, { color: toneStyles[tone].text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 13,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs + 1,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
  },
  label: {
    ...typography.caption,
    ...(Platform.OS === "web"
      ? { fontFamily: "'Inter', sans-serif", fontWeight: "700" as const }
      : { fontFamily: "Inter_700Bold" }),
  },
});
