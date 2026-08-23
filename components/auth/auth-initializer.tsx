"use client";

import { useEffect } from "react";
import {
  createUserFromSso,
  IS_DEV_MOCK_LOGIN_ENABLED,
  useUserStore,
  type SsoUser,
} from "@/store";

export function AuthInitializer() {
  const setUser = useUserStore((state) => state.setUser);
  const clearUser = useUserStore((state) => state.clearUser);

  useEffect(() => {
    if (IS_DEV_MOCK_LOGIN_ENABLED) return;

    const controller = new AbortController();
    void fetch("/api/auth/me", {
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = (await response.json()) as {
          user?: SsoUser;
          error?: string;
        };
        if (!response.ok || !result.user) {
          throw new Error(result.error ?? "로그인 정보를 확인하지 못했습니다.");
        }
        setUser(createUserFromSso(result.user));
      })
      .catch((error) => {
        if (error instanceof Error && error.name !== "AbortError") {
          clearUser();
        }
      });

    return () => controller.abort();
  }, [clearUser, setUser]);

  return null;
}
