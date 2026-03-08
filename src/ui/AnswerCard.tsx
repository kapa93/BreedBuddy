import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "../theme";
import { Avatar } from "./Avatar";
import { ReactionPill } from "./ReactionPill";

export function AnswerCard({ author, body, helpfulCount = 0 }: { author: string; body: string; helpfulCount?: number }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Avatar size={40} />
        <Text style={styles.author}>{author}</Text>
      </View>
      <Text style={styles.body}>{body}</Text>
      <View style={styles.footer}>
        <ReactionPill emoji="🐾" label="Helpful" />
        <Text style={styles.count}>{helpfulCount}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
  header: { flexDirection: "row", alignItems: "center", marginBottom: spacing.md },
  author: { ...typography.subtitle, marginLeft: spacing.md },
  body: { ...typography.body },
  footer: { flexDirection: "row", alignItems: "center", marginTop: spacing.md },
  count: { ...typography.bodyMuted, marginLeft: spacing.sm, fontWeight: "700" },
});
