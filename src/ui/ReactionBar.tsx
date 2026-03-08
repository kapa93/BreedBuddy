import React from "react";
import { StyleSheet, View } from "react-native";
import { spacing } from "../theme";
import { ReactionPill } from "./ReactionPill";

export function ReactionBar({ likeCount = 0, loveCount = 0, hahaCount = 0, onReact }: { likeCount?: number; loveCount?: number; hahaCount?: number; onReact?: () => void }) {
  return (
    <View style={styles.row}>
      <ReactionPill emoji="👍" label={`Like ${likeCount}`} />
      <ReactionPill emoji="❤️" label={`Love ${loveCount}`} />
      <ReactionPill emoji="😂" label={`Haha ${hahaCount}`} />
      <ReactionPill emoji="🟢" label="React" variant="outline" onPress={onReact} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", marginTop: spacing.md },
});
