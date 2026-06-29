import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import { notify } from "./toast";
import type {
  AccountStats,
  BudgetStatus,
  Category,
  CategorySlice,
  DigestTestResult,
  LastSalary,
  MonthlyPoint,
  Profile,
  SavingsGoal,
  SavingsGoalRequest,
  SavingsPoint,
  StatementImportResult,
  Summary,
  Transaction,
  TransactionRequest,
  UpdateProfileRequest,
} from "./types";

type Range = { from: string; to: string };

/* ---- Transactions ---- */

export function useTransactions(range?: Range) {
  const qs = range ? `?from=${range.from}&to=${range.to}` : "";
  return useQuery({
    queryKey: ["transactions", range],
    queryFn: () => api.get<Transaction[]>(`/transactions${qs}`),
  });
}

export function useSaveTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id?: number; body: TransactionRequest }) =>
      input.id
        ? api.put<Transaction>(`/transactions/${input.id}`, input.body)
        : api.post<Transaction>("/transactions", input.body),
    onSuccess: (_data, input) => {
      invalidateFinancials(qc);
      notify.success(input.id ? "Transaction updated" : "Transaction added");
    },
    onError: (e) => notify.error((e as Error).message),
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.del(`/transactions/${id}`),
    onSuccess: () => {
      invalidateFinancials(qc);
      notify.success("Transaction deleted");
    },
    onError: (e) => notify.error((e as Error).message),
  });
}

export function useImportStatement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, password }: { file: File; password?: string }) => {
      const form = new FormData();
      form.append("file", file);
      if (password) form.append("password", password);
      return api.upload<StatementImportResult>("/transactions/import", form);
    },
    onSuccess: () => invalidateFinancials(qc),
  });
}

/* ---- Categories ---- */

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => api.get<Category[]>("/categories"),
  });
}

/* ---- Savings goals ---- */

export function useGoals() {
  return useQuery({
    queryKey: ["goals"],
    queryFn: () => api.get<SavingsGoal[]>("/goals"),
  });
}

export function useSaveGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id?: number; body: SavingsGoalRequest }) =>
      input.id
        ? api.put<SavingsGoal>(`/goals/${input.id}`, input.body)
        : api.post<SavingsGoal>("/goals", input.body),
    onSuccess: (_data, input) => {
      qc.invalidateQueries({ queryKey: ["goals"] });
      notify.success(input.id ? "Goal updated" : "Goal created");
    },
    onError: (e) => notify.error((e as Error).message),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.del(`/goals/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals"] });
      notify.success("Goal deleted");
    },
    onError: (e) => notify.error((e as Error).message),
  });
}

/* ---- Analytics ---- */

/* ---- Profile / account ---- */

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: () => api.get<Profile>("/me"),
    staleTime: 5 * 60_000,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateProfileRequest) => api.put<Profile>("/me", body),
    onSuccess: (profile) => {
      qc.setQueryData(["profile"], profile);
      qc.invalidateQueries({ queryKey: ["account-stats"] });
      notify.success("Profile updated");
    },
    onError: (e) => notify.error((e as Error).message),
  });
}

export function useAccountStats() {
  return useQuery({
    queryKey: ["account-stats"],
    queryFn: () => api.get<AccountStats>("/me/stats"),
  });
}

export function useSendTestDigest() {
  return useMutation({
    mutationFn: () => api.post<DigestTestResult>("/me/digest/test", {}),
    onSuccess: (res) => (res.sent ? notify.success(res.message) : notify.error(res.message)),
    onError: (e) => notify.error((e as Error).message),
  });
}

export function useLastSalary() {
  return useQuery({
    queryKey: ["last-salary"],
    // 204 No Content (no salary yet) resolves to undefined.
    queryFn: () => api.get<LastSalary | undefined>("/analytics/last-salary"),
  });
}

export function useSummary(range: Range) {
  return useQuery({
    queryKey: ["summary", range],
    queryFn: () => api.get<Summary>(`/analytics/summary?from=${range.from}&to=${range.to}`),
  });
}

export function useSpendByCategory(range: Range) {
  return useQuery({
    queryKey: ["spend-by-category", range],
    queryFn: () =>
      api.get<CategorySlice[]>(`/analytics/spend-by-category?from=${range.from}&to=${range.to}`),
  });
}

export function useIncomeVsExpense(range: Range) {
  return useQuery({
    queryKey: ["income-vs-expense", range],
    queryFn: () =>
      api.get<MonthlyPoint[]>(`/analytics/income-vs-expense?from=${range.from}&to=${range.to}`),
  });
}

export function useSavingsTrend(range: Range) {
  return useQuery({
    queryKey: ["savings-trend", range],
    queryFn: () =>
      api.get<SavingsPoint[]>(`/analytics/savings-trend?from=${range.from}&to=${range.to}`),
  });
}

/* ---- Budgets ---- */

export function useBudgetStatus(range: Range) {
  return useQuery({
    queryKey: ["budgets", range],
    queryFn: () => api.get<BudgetStatus[]>(`/budgets?from=${range.from}&to=${range.to}`),
  });
}

export function useSetBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ categoryId, monthlyBudget }: { categoryId: number; monthlyBudget: number }) =>
      api.put<BudgetStatus>(`/budgets/${categoryId}`, { monthlyBudget }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budgets"] });
      notify.success("Budget saved");
    },
    onError: (e) => notify.error((e as Error).message),
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (categoryId: number) => api.del(`/budgets/${categoryId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budgets"] });
      notify.success("Budget removed");
    },
    onError: (e) => notify.error((e as Error).message),
  });
}

function invalidateFinancials(qc: ReturnType<typeof useQueryClient>) {
  [
    "transactions",
    "summary",
    "spend-by-category",
    "income-vs-expense",
    "savings-trend",
    "last-salary",
    "account-stats",
    "budgets",
  ].forEach((key) => qc.invalidateQueries({ queryKey: [key] }));
}
