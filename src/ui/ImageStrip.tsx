import React from "react";
import { Image, ImageSourcePropType, StyleSheet, View } from "react-native";
import { radius, spacing } from "../theme";

export function ImageStrip({ images, height = 92 }: { images: ImageSourcePropType[]; height?: number }) {
  const shown = images.slice(0, 3);
  return (
    <View style={styles.row}>
      {shown.map((image, idx) => (
        <Image key={idx} source={image} style={[styles.image, { height }]} resizeMode="cover" />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  image: { flex: 1, borderRadius: radius.md },
});
