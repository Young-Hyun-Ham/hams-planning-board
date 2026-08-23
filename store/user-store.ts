"use client";

import { create } from "zustand";

export type User = {
  id: string;
  sub: string;
  uid: string;
  email: string;
  username: string;
  name: string;
  displayName: string;
  nickname: string;
  loginId: string;
  loginIdLower: string;
  emailLower: string;
  roles: string[];
  provider: string;
  providerSubject: string | null;
  phoneNumber: string | null;
  aiEnabled: boolean;
  aiChatType: string;
  chatModel: string;
  termsAcceptedAt: string | null;
  termsVersion: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SsoUser = {
  id: string;
  email: string;
  loginId: string;
  nickname: string;
  provider: string;
  providerSubject: string | null;
  phoneNumber: string | null;
  termsVersion: string | null;

  aiEnabled: boolean;
  aiChatType: "gpt" | "gemini" | "claude" | null;
  chatModel: string | null;
  createdAt: string;
  updatedAt: string;
};

export const USER_MOCK_DATA: User = {
  id: "3f206e64-1de1-4720-8013-6261f3aaeb461",
  sub: "3f206e64-1de1-4720-8013-6261f3aaeb461",
  uid: "3f206e64-1de1-4720-8013-6261f3aaeb461",
  email: "hyh841412@gmail.com",
  username: "함영현",
  name: "함영현",
  displayName: "함영현",
  nickname: "함영현",
  loginId: "ghyh84141",
  loginIdLower: "ghyh84141",
  emailLower: "hyh841412@gmail.com",
  roles: ["user", "admin"],
  provider: "google",
  providerSubject: null,
  phoneNumber: "01099360110",
  aiEnabled: true,
  aiChatType: "gpt",
  chatModel: "gpt-3.5-turbo",
  termsAcceptedAt: null,
  termsVersion: null,
  createdAt: "2026-04-09T06:56:22.125Z",
  updatedAt: "2026-04-24T05:00:11.863Z",
};

export const IS_DEV_MOCK_LOGIN_ENABLED =
  process.env.NEXT_PUBLIC_DEV_MOCK_LOGIN === "true";

function createInitialUser() {
  return IS_DEV_MOCK_LOGIN_ENABLED
    ? { ...USER_MOCK_DATA, roles: [...USER_MOCK_DATA.roles] }
    : null;
}

export function createUserFromSso(ssoUser: SsoUser): User {
  const displayName =
    ssoUser.nickname || ssoUser.loginId || ssoUser.email.split("@")[0];

  return {
    id: ssoUser.id,
    sub: ssoUser.id,
    uid: ssoUser.id,
    email: ssoUser.email,
    username: displayName,
    name: displayName,
    displayName,
    nickname: displayName,
    loginId: ssoUser.loginId,
    loginIdLower: ssoUser.loginId.toLowerCase(),
    emailLower: ssoUser.email.toLowerCase(),
    roles: ["user"],
    provider: ssoUser.provider,
    providerSubject: ssoUser.providerSubject,
    phoneNumber: ssoUser.phoneNumber,
    termsAcceptedAt: null,
    termsVersion: ssoUser.termsVersion,

    aiEnabled: ssoUser.aiEnabled,
    aiChatType: ssoUser.aiChatType ?? "",
    chatModel: ssoUser.chatModel ?? "",
    createdAt: ssoUser.createdAt,
    updatedAt: ssoUser.updatedAt,
  };
}

type UserState = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (isLoading: boolean) => void;
  clearUser: () => void;
  resetUser: () => void;
};

const initialUser = createInitialUser();

export const useUserStore = create<UserState>((set) => ({
  user: initialUser,
  isAuthenticated: initialUser !== null,
  isLoading: !IS_DEV_MOCK_LOGIN_ENABLED,
  setUser: (user) =>
    set({
      user,
      isAuthenticated: user !== null,
      isLoading: false,
    }),
  setLoading: (isLoading) => set({ isLoading }),
  clearUser: () =>
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    }),
  resetUser: () => {
    const user = createInitialUser();
    set({
      user,
      isAuthenticated: user !== null,
      isLoading: false,
    });
  },
}));
