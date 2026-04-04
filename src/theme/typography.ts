import { Platform, TextStyle } from "react-native";
import { colors } from "./colors";

function fontByWeight(weight: "500" | "700" | "800"): TextStyle {
  if (Platform.OS === "web") {
    return { fontFamily: "'Inter', sans-serif", fontWeight: weight };
  }

  if (weight === "800") return { fontFamily: "Inter_800ExtraBold" };
  if (weight === "700") return { fontFamily: "Inter_700Bold" };
  return { fontFamily: "Inter_400Regular" };
}

export const typography: Record<string, TextStyle> = {
  titleXL: { ...fontByWeight("800"), fontSize: 34, lineHeight: 40, color: colors.textPrimary },
  titleLG: { ...fontByWeight("800"), fontSize: 28, lineHeight: 34, color: colors.textPrimary },
  titleMD: { ...fontByWeight("700"), fontSize: 22, lineHeight: 28, color: colors.textPrimary },
  subtitle: { ...fontByWeight("700"), fontSize: 18, lineHeight: 24, color: colors.textPrimary },
  body: { ...fontByWeight("500"), fontSize: 16, lineHeight: 22, color: colors.textPrimary },
  bodyMuted: { ...fontByWeight("500"), fontSize: 15, lineHeight: 21, color: colors.textSecondary },
  caption: { ...fontByWeight("500"), fontSize: 13, lineHeight: 18, color: colors.textMuted },
};
