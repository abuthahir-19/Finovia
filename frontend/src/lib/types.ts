export type TransactionType = "EXPENSE" | "INCOME";
export type GoalStatus = "ACTIVE" | "ACHIEVED" | "ARCHIVED";

export interface Transaction {
  id: number;
  type: TransactionType;
  amount: number;
  categoryId: number | null;
  currency: string;
  description: string | null;
  occurredOn: string; // ISO date
}

export interface TransactionRequest {
  type: TransactionType;
  amount: number;
  categoryId: number | null;
  currency?: string;
  description?: string;
  occurredOn: string;
}

export interface Category {
  id: number;
  name: string;
  kind: TransactionType;
  color: string | null;
  icon: string | null;
  system: boolean;
}

export interface SavingsGoal {
  id: number;
  name: string;
  targetAmount: number;
  currentAmount: number;
  progressPct: number;
  targetDate: string | null;
  status: GoalStatus;
}

export interface SavingsGoalRequest {
  name: string;
  targetAmount: number;
  currentAmount?: number;
  targetDate?: string | null;
}

export interface CategorySlice {
  categoryId: number | null;
  category: string;
  total: number;
  color: string;
}

export interface MonthlyPoint {
  period: string;
  income: number;
  expense: number;
  net: number;
}

export interface SavingsPoint {
  period: string;
  cumulativeSavings: number;
}

export interface Insight {
  severity: "success" | "info" | "warning" | "danger";
  title: string;
  message: string;
}

export interface Summary {
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  savingsRatePct: number;
  topExpenseCategories: CategorySlice[];
  insights: Insight[];
}

export interface LastSalary {
  date: string; // ISO date
  amount: number;
}

export type DigestFrequency = "NONE" | "WEEKLY" | "MONTHLY";

export interface Profile {
  id: number;
  email: string;
  displayName: string;
  baseCurrency: string;
  digestFrequency: DigestFrequency;
  createdAt: string;
}

export interface UpdateProfileRequest {
  displayName?: string;
  baseCurrency?: string;
  digestFrequency?: DigestFrequency;
}

export interface DigestTestResult {
  sent: boolean;
  emailEnabled: boolean;
  message: string;
}

export interface AccountStats {
  transactionCount: number;
  totalIncome: number;
  totalExpense: number;
  net: number;
  goalCount: number;
  activeGoalCount: number;
  achievedGoalCount: number;
}

export interface StatementImportResult {
  importedCount: number;
  skippedCount: number;
  imported: Transaction[];
  warnings: string[];
}
