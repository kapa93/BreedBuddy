import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import type { Profile } from '@/types';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isGuest: boolean;
  pendingSignUp: boolean;
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setIsGuest: (v: boolean) => void;
  setPendingSignUp: (v: boolean) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  profile: null,
  isGuest: false,
  pendingSignUp: false,
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setIsGuest: (isGuest) => set({ isGuest }),
  setPendingSignUp: (pendingSignUp) => set({ pendingSignUp }),
  signOut: () =>
    set({
      session: null,
      user: null,
      profile: null,
      isGuest: false,
    }),
}));
