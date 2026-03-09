import React from "react";
import { ImageBackground, StyleSheet, View, ViewStyle } from "react-native";

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  showOverlay?: boolean;
};

export function ScreenWithWallpaper({ children, style, showOverlay = false }: Props) {
  return (
    <ImageBackground
      source={require("../../assets/dog-app-wallpaper.png")}
      style={[styles.background, style]}
      resizeMode="cover"
    >
      {showOverlay && <View style={styles.overlay} />}
      {children}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.01)",
  },
});
