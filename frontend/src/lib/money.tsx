import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useProfile } from "./hooks";
import { formatCurrency } from "./format";

interface CurrencyContextValue {
  currency: string;
  money: (value: number) => string;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: "INR",
  money: (v) => formatCurrency(v, "INR"),
});

/**
 * Provides the user's base currency (from their profile) to the whole app, so all
 * amounts render in their chosen currency. Falls back to INR until the profile loads.
 */
export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { data: profile } = useProfile();
  const currency = profile?.baseCurrency ?? "INR";

  const money = useCallback((value: number) => formatCurrency(value, currency), [currency]);
  const value = useMemo(() => ({ currency, money }), [currency, money]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

/** Returns a formatter bound to the user's base currency. */
export function useMoney() {
  return useContext(CurrencyContext).money;
}

export function useCurrency() {
  return useContext(CurrencyContext).currency;
}
