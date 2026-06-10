import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createServerFn } from "@tanstack/react-start";
import type { UserState } from "./user-state-server";
import type { PlanTier } from "./plans";
import { getNextResetDate, PLANS } from "./plans";

const fetchUserState = createServerFn({ method: "POST" }).handler(async () => {
  const { requireAuth } = await import("./auth/server-auth");
  const { getUserState } = await import("./user-state-server");
  const user = await requireAuth();
  return getUserState(user.email);
});

export const assignPlan = createServerFn({ method: "POST" })
  .inputValidator((d: { tier: PlanTier }) => d)
  .handler(async ({ data }) => {
    const { requireAuth } = await import("./auth/server-auth");
    const { assignUserPlan } = await import("./user-state-server");
    const user = await requireAuth();
    if (data.tier !== "free" && data.tier !== "creator" && data.tier !== "pro") {
      throw new Error("INVALID_PLAN");
    }
    return assignUserPlan(user.email, data.tier);
  });

export const consumeUserCredit = createServerFn({ method: "POST" }).handler(async () => {
  const { requireAuth } = await import("./auth/server-auth");
  const { deductUserCredit } = await import("./user-state-server");
  const user = await requireAuth();
  return deductUserCredit(user.email);
});

interface UserStateContextValue {
  state: UserState | null;
  loading: boolean;
  refresh: () => Promise<void>;
  consumeCredit: () => Promise<UserState>;
  hasCredits: boolean;
}

const UserStateContext = createContext<UserStateContextValue | null>(null);

export function UserStateProvider({
  email,
  children,
}: {
  email: string | null;
  children: ReactNode;
}) {
  const [state, setState] = useState<UserState | null>(null);
  const [loading, setLoading] = useState(!!email);

  const refresh = useCallback(async () => {
    if (!email) {
      setState(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const next = await fetchUserState();
      setState(next);
    } catch {
      setState(null);
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const consumeCredit = useCallback(async () => {
    const next = await consumeUserCredit();
    setState(next);
    return next;
  }, []);

  const value = useMemo(
    () => ({
      state,
      loading,
      refresh,
      consumeCredit,
      hasCredits: (state?.remaining ?? 0) > 0,
    }),
    [state, loading, refresh, consumeCredit],
  );

  return <UserStateContext.Provider value={value}>{children}</UserStateContext.Provider>;
}

export function useUserState(): UserStateContextValue {
  const ctx = useContext(UserStateContext);
  if (!ctx) {
    throw new Error("useUserState must be used within UserStateProvider");
  }
  return ctx;
}

/** Safe hook for components that may render outside the provider (e.g. landing pages) */
export function useUserStateOptional(): UserStateContextValue | null {
  return useContext(UserStateContext);
}

export function usePlanDisplay() {
  const { state } = useUserStateOptional() ?? { state: null };
  const plan = state?.plan ?? "free";
  return {
    tier: plan,
    label: PLANS[plan].label,
    price: PLANS[plan].price,
    credits: state?.remaining ?? 0,
    maxCredits: state?.maxCredits ?? PLANS.free.creditsPerMonth,
    nextReset: getNextResetDate(),
    hasPlan: state?.hasPlan ?? false,
  };
}
