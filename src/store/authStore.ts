import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  user: User | null;
  needsOnboarding: boolean;
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  setNeedsOnboarding: (value: boolean) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  needsOnboarding: false,
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setUser: (user) => set({ user }),
  setNeedsOnboarding: (value) => set({ needsOnboarding: value }),
  signOut: () => set({ session: null, user: null, needsOnboarding: false }),
}));
