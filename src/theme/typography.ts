import { TextStyle } from "react-native";
import { colors } from "./colors";

export const typography: Record<string, TextStyle> = {
  titleXL: { fontSize: 34, lineHeight: 40, fontWeight: "800", color: colors.textPrimary },
  titleLG: { fontSize: 28, lineHeight: 34, fontWeight: "800", color: colors.textPrimary },
  titleMD: { fontSize: 22, lineHeight: 28, fontWeight: "700", color: colors.textPrimary },
  subtitle: { fontSize: 18, lineHeight: 24, fontWeight: "700", color: colors.textPrimary },
  body: { fontSize: 16, lineHeight: 22, fontWeight: "500", color: colors.textPrimary },
  bodyMuted: { fontSize: 15, lineHeight: 21, fontWeight: "500", color: colors.textSecondary },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: "500", color: colors.textMuted },
};
