import { useCallback } from "react";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";

/**
 * Wraps an action so it runs normally for authenticated users and shows the
 * guest signup prompt for unauthenticated (guest) users.
 *
 * Usage:
 *   const handleLike = useGatedAction(() => toggleLike(postId));
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useGatedAction<T extends (...args: any[]) => any>(action: T): T {
  const user = useAuthStore((s) => s.user);
  const showGuestPrompt = useUIStore((s) => s.showGuestPrompt);

  return useCallback(
    (...args: Parameters<T>) => {
      if (user) return action(...args);
      showGuestPrompt();
    },
    // action is intentionally excluded from deps — callers should memoize it if needed
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, showGuestPrompt],
  ) as T;
}
