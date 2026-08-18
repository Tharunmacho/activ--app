import { create } from 'zustand';
import { Member, Application } from '../types';

interface MemberState {
  member: Member | null;
  application: Application | null;
  isLoading: boolean;
  
  // Actions
  setMember: (member: Member) => void;
  setApplication: (application: Application | null) => void;
  updateMember: (updates: Partial<Member>) => void;
  clearMember: () => void;
}

export const useMemberStore = create<MemberState>((set) => ({
  member: null,
  application: null,
  isLoading: false,
  
  setMember: (member) => set({ member }),
  
  setApplication: (application) => set({ application }),
  
  updateMember: (updates) =>
    set((state) => ({
      member: state.member ? { ...state.member, ...updates } : null,
    })),
  
  clearMember: () => set({ member: null, application: null }),
}));
