import {
  Briefcase,
  Car,
  Film,
  HeartPulse,
  Home,
  Laptop,
  type LucideIcon,
  MoreHorizontal,
  Receipt,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
  Utensils,
  Wallet,
  Zap,
} from "lucide-react";
import type { TransactionType } from "./types";

/**
 * Maps a category to a meaningful infographic icon. Resolves by the seeded
 * category name first, then falls back to a sensible default per transaction kind.
 */
const BY_NAME: Record<string, LucideIcon> = {
  Groceries: ShoppingCart,
  Dining: Utensils,
  Rent: Home,
  Utilities: Zap,
  Transport: Car,
  Entertainment: Film,
  Health: HeartPulse,
  Shopping: ShoppingBag,
  "Other Expense": MoreHorizontal,
  Salary: Briefcase,
  Freelance: Laptop,
  Investments: TrendingUp,
  "Other Income": Wallet,
};

export function getCategoryIcon(name: string | null | undefined, kind?: TransactionType): LucideIcon {
  if (name && BY_NAME[name]) return BY_NAME[name];
  return kind === "INCOME" ? Wallet : Receipt;
}
