import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useMoney } from "./money";

interface PrivacyContextValue {
  isPrivate: boolean;
  toggle: () => void;
}

const PrivacyContext = createContext<PrivacyContextValue>({
  isPrivate: false,
  toggle: () => {},
});

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [isPrivate, setIsPrivate] = useState(true);
  const toggle = useCallback(() => setIsPrivate((p) => !p), []);
  const value = useMemo(() => ({ isPrivate, toggle }), [isPrivate, toggle]);
  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>;
}

export function usePrivacy() {
  return useContext(PrivacyContext);
}

/** Drop-in replacement for useMoney() — masks all amounts when privacy mode is on. */
export function usePrivacyMoney() {
  const money = useMoney();
  const { isPrivate } = usePrivacy();
  return useCallback(
    (value: number) => (isPrivate ? "••••" : money(value)),
    [isPrivate, money],
  );
}
