/**
 * Global client state: the signed in user, profile/progress snapshot, and a
 * couple of UI flags (like the ghost's current mood) that many screens read.
 * Server data (profile, progress) is always refetched through the api client;
 * this store just holds the latest snapshot so screens do not refetch on every render.
 */
import { create } from 'zustand';
import type { ProgressSnapshot, UserProfile } from '@kirocrew-academy/shared';
import type { GhostMood } from '../components/KiroGhost';

interface AuthedUser {
  email: string;
  sub: string;
}

interface AcademyState {
  authUser: AuthedUser | null;
  profile: UserProfile | null;
  progress: ProgressSnapshot | null;
  ghostMood: GhostMood;
  setAuthUser: (user: AuthedUser | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setProgress: (progress: ProgressSnapshot | null) => void;
  setGhostMood: (mood: GhostMood) => void;
  reset: () => void;
}

export const useAcademyStore = create<AcademyState>((set) => ({
  authUser: null,
  profile: null,
  progress: null,
  ghostMood: 'idle',
  setAuthUser: (authUser) => set({ authUser }),
  setProfile: (profile) => set({ profile }),
  setProgress: (progress) => set({ progress }),
  setGhostMood: (ghostMood) => set({ ghostMood }),
  reset: () => set({ authUser: null, profile: null, progress: null, ghostMood: 'idle' }),
}));
