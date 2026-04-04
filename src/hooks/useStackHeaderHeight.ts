import { useSafeAreaInsets } from "react-native-safe-area-context";

const BAR_HEIGHT = 39; // 5px shorter than default iOS (44)
const OFFSET = 0; // Full header height for content padding

/**
 * Must match RootNavigator `CreatePostModal` `baseHeaderHeight` (grabber + title + separator).
 */
export const CREATE_POST_SHEET_MODAL_HEADER_HEIGHT = 65;

/** Pushed Create Post: matches `AnimatedStackHeader` `baseHeaderHeight` + safe-area top. */
export const CREATE_POST_STACK_HEADER_BAR = 40;

type StackHeaderHeightOpts = {
  createPostSheetModal?: boolean;
  createPostPushed?: boolean;
};

/** Height of the animated stack header (matches AnimatedStackHeader) */
export function useStackHeaderHeight(opts?: StackHeaderHeightOpts): number {
  const insets = useSafeAreaInsets();
  if (opts?.createPostSheetModal) {
    return CREATE_POST_SHEET_MODAL_HEADER_HEIGHT;
  }
  if (opts?.createPostPushed) {
    return CREATE_POST_STACK_HEADER_BAR + insets.top;
  }
  return BAR_HEIGHT + insets.top - OFFSET;
}
