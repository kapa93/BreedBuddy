import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface OnboardingDog {
  name: string;
  breed: string;
}

interface OnboardingState {
  hasHydrated: boolean;
  needsOnboarding: boolean;
  onboardingDog: OnboardingDog | null;
  showPostPrompt: boolean;
  showMeetupPrompt: boolean;
  setHasHydrated: (value: boolean) => void;
  setNeedsOnboarding: (value: boolean) => void;
  completeOnboarding: (name: string, breed: string) => void;
  dismissOnboardingCard: () => void;
  dismissPostPrompt: () => void;
  dismissMeetupPrompt: () => void;
  resetOnboardingState: () => void;
}

const INITIAL_ONBOARDING_STATE = {
  hasHydrated: false,
  needsOnboarding: false,
  onboardingDog: null,
  showPostPrompt: false,
  showMeetupPrompt: false,
} as const;

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      ...INITIAL_ONBOARDING_STATE,
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      setNeedsOnboarding: (needsOnboarding) => set({ needsOnboarding }),
      completeOnboarding: (name, breed) =>
        set({ needsOnboarding: false, onboardingDog: { name, breed } }),
      dismissOnboardingCard: () => set({ onboardingDog: null, showPostPrompt: true }),
      dismissPostPrompt: () => set({ showPostPrompt: false, showMeetupPrompt: true }),
      dismissMeetupPrompt: () => set({ showMeetupPrompt: false }),
      resetOnboardingState: () => set(INITIAL_ONBOARDING_STATE),
    }),
    {
      name: 'onboarding-progress-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        needsOnboarding: state.needsOnboarding,
        onboardingDog: state.onboardingDog,
        showPostPrompt: state.showPostPrompt,
        showMeetupPrompt: state.showMeetupPrompt,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
