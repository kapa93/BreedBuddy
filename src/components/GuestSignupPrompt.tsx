import React from "react";
import { Modal, View, Text, Pressable, StyleSheet } from "react-native";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import { colors, radius, spacing, typography } from "@/theme";

export function GuestSignupPrompt() {
  const visible = useUIStore((s) => s.guestPromptVisible);
  const hideGuestPrompt = useUIStore((s) => s.hideGuestPrompt);
  const setIsGuest = useAuthStore((s) => s.setIsGuest);
  const setPendingSignUp = useAuthStore((s) => s.setPendingSignUp);

  const handleSignUp = () => {
    hideGuestPrompt();
    setPendingSignUp(true);
    setIsGuest(false);
  };

  const handleLogIn = () => {
    hideGuestPrompt();
    setIsGuest(false);
  };

  const handleDismiss = () => {
    hideGuestPrompt();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <Pressable style={styles.overlay} onPress={handleDismiss}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Create an account to join in</Text>
          <Text style={styles.body}>
            Browse freely, or sign up to post, comment, save places, and share
            dog-friendly tips.
          </Text>

          <Pressable
            style={({ pressed }) => [styles.signUpBtn, pressed && styles.signUpBtnPressed]}
            onPress={handleSignUp}
          >
            <Text style={styles.signUpText}>Sign Up</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.logInBtn, pressed && styles.logInBtnPressed]}
            onPress={handleLogIn}
          >
            <Text style={styles.logInText}>Log In</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.dismissBtn, pressed && styles.dismissBtnPressed]}
            onPress={handleDismiss}
          >
            <Text style={styles.dismissText}>Not Now</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  sheet: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  title: {
    ...typography.titleMD,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  body: {
    ...typography.bodyMuted,
    textAlign: "center",
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  signUpBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  signUpBtnPressed: {
    backgroundColor: colors.primaryDark,
  },
  signUpText: {
    ...typography.body,
    color: colors.surface,
  },
  logInBtn: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logInBtnPressed: {
    backgroundColor: colors.border,
  },
  logInText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  dismissBtn: {
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderRadius: radius.md,
  },
  dismissBtnPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  dismissText: {
    ...typography.body,
    color: colors.textMuted,
  },
});
