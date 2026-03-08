import React from "react";
import { Image, ImageSourcePropType, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

type Props = { size?: number; source?: ImageSourcePropType; fallback?: string };

export function Avatar({ size = 44, source, fallback = "🐶" }: Props) {
  if (source) {
    return <Image source={source} style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]} />;
  }
  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={styles.fallbackText}>{fallback}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: colors.surfaceMuted },
  fallback: { alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.border },
  fallbackText: { fontSize: 18 },
});
