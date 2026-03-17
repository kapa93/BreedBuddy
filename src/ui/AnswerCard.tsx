import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, shadow, spacing, typography } from "../theme";
import { Avatar } from "./Avatar";
import { ReactionPill } from "./ReactionPill";

type Props = {
  author: string;
  body: string;
  avatarUri?: string | null;
  timestamp?: string;
  helpfulCount?: number;
  onAuthorPress?: () => void;
};

export function AnswerCard({ author, body, avatarUri, timestamp, helpfulCount = 0, onAuthorPress }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Pressable style={styles.authorPressable} disabled={!onAuthorPress} onPress={onAuthorPress}>
          <Avatar
            size={40}
            source={avatarUri ? { uri: avatarUri } : undefined}
            fallback={author?.[0]?.toUpperCase() ?? "🐶"}
          />
          <Text style={styles.author}>{author}</Text>
        </Pressable>
        {timestamp ? <Text style={styles.timestamp}>{timestamp}</Text> : null}
      </View>
      <Text style={styles.body}>{body}</Text>
      {helpfulCount > 0 && (
        <View style={styles.footer}>
          <ReactionPill emoji="🐾" label="Helpful" />
          <Text style={styles.count}>{helpfulCount}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow.sm },
  header: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm },
  authorPressable: { flex: 1, flexDirection: "row", alignItems: "center" },
  author: { ...typography.subtitle, flex: 1, marginLeft: spacing.md },
  timestamp: { ...typography.caption },
  body: { ...typography.body },
  footer: { flexDirection: "row", alignItems: "center", marginTop: spacing.md },
  count: { ...typography.bodyMuted, marginLeft: spacing.sm, fontWeight: "700" },
});
