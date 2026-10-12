// app/store/useAuthStore.ts
import { create } from "zustand";

export interface IOrg {
  id: string;
  name: string;
  slug: string;
  role: string;
}

export interface IUser {
  id: string;
  email: string;
  name?: string | null;
  activeOrgId?: string;
  orgs?: IOrg[];
}

interface IAuthStore {
  user: IUser | null;
  accessToken: string | null;
  isInitializing: boolean;
  setInitializing: (isInitializing: boolean) => void;
  setAccessToken: (token: string | null) => void;
  logout: () => void;
  setAuth: (user: IUser, accessToken: string) => void;
  setActiveOrgId: (orgId: string) => void;
  applyOrgSwitch: (orgId: string, accessToken: string) => void;
}

export const useAuthStore = create<IAuthStore>((set) => ({
  user: null,
  accessToken: null,
  isInitializing: true,
  setInitializing: (isInitializing) => set({ isInitializing }),
  setAccessToken: (accessToken) => set({ accessToken }),
  logout: () => set({ accessToken: null, user: null, isInitializing: false }),
  setAuth: (user, accessToken) => set({ user, accessToken, isInitializing: false }),
  setActiveOrgId: (orgId) => set((state) => ({
    user: state.user ? { ...state.user, activeOrgId: orgId } : null
  })),
  applyOrgSwitch: (orgId, accessToken) => set((state) => ({
    accessToken,
    user: state.user ? { ...state.user, activeOrgId: orgId } : null,
  })),
}));