import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "../theme";
import { Avatar } from "./Avatar";
import { ImageStrip } from "./ImageStrip";
import { ReactionBar } from "./ReactionBar";
import { TagChip } from "./TagChip";
import type { QuestionCardData } from "./types";

export function QuestionCard({ data }: { data: QuestionCardData }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Avatar size={42} />
        <View style={styles.headerText}>
          <Text style={styles.author}>{data.author}</Text>
          <Text style={styles.meta}>{data.authorMeta ?? "Question • 1h ago"}</Text>
        </View>
        <Text style={styles.time}>⋯</Text>
      </View>

      <View style={styles.badges}>
        <TagChip label={data.badge ?? "Question"} tone="question" />
        <View style={{ width: spacing.sm }} />
        <TagChip label="Training" tone="tip" />
      </View>

      <Text style={styles.title}>{data.title}</Text>
      {!!data.preview && <Text style={styles.preview}>{data.preview}</Text>}
      {!!data.images?.length && <ImageStrip images={data.images} />}
      <ReactionBar likeCount={data.likeCount} loveCount={data.loveCount} hahaCount={data.hahaCount} />
      <View style={styles.answersPill}>
        <Text style={styles.answersText}>💬 {data.answerCount ?? 0} Answers</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg },
  header: { flexDirection: "row", alignItems: "center" },
  headerText: { flex: 1, marginLeft: spacing.md },
  author: { ...typography.subtitle, fontSize: 18 },
  meta: { ...typography.caption },
  time: { ...typography.caption, fontSize: 22 },
  badges: { flexDirection: "row", alignItems: "center", marginTop: spacing.md },
  title: { ...typography.titleMD, marginTop: spacing.md },
  preview: { ...typography.bodyMuted, marginTop: spacing.sm },
  answersPill: { alignSelf: "flex-start", backgroundColor: colors.surfaceMuted, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginTop: spacing.md },
  answersText: { ...typography.bodyMuted, fontWeight: "700" },
});
