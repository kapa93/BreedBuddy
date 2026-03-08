import { create } from 'zustand';
import type { BreedEnum, PostWithDetails, PostTypeEnum } from '../types';

export type FeedSort = 'newest' | 'trending';

export type FeedFilter = FeedSort | PostTypeEnum;

interface UIState {
  feedFilter: FeedFilter;
  setFeedFilter: (filter: FeedFilter) => void;
  reactionPickerPost: PostWithDetails | null;
  setReactionPickerPost: (post: PostWithDetails | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  feedFilter: 'newest',
  setFeedFilter: (feedFilter) => set({ feedFilter }),
  reactionPickerPost: null,
  setReactionPickerPost: (reactionPickerPost) => set({ reactionPickerPost }),
}));
