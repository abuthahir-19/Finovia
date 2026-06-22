package com.expensetracker.finance.web.dto;

import java.math.BigDecimal;
import java.util.List;

/** Chart-ready DTOs returned by the analytics endpoints. */
public final class AnalyticsDtos {

    private AnalyticsDtos() {
    }

    /** One slice of a spend-by-category pie/donut chart. */
    public record CategorySlice(Long categoryId, String category, BigDecimal total, String color) {
    }

    /** One bar in an income-vs-expense chart, plus derived net savings. */
    public record MonthlyPoint(String period, BigDecimal income, BigDecimal expense, BigDecimal net) {
    }

    /** A point on the cumulative savings-trend line. */
    public record SavingsPoint(String period, BigDecimal cumulativeSavings) {
    }

    /** A single rule-based budgeting insight surfaced to the user. */
    public record Insight(String severity, String title, String message) {
    }

    /** The user's most recent salary income — anchors the "since last salary" period. */
    public record LastSalary(java.time.LocalDate date, BigDecimal amount) {
    }

    /** Top-of-dashboard summary KPIs for the selected window. */
    public record Summary(
            BigDecimal totalIncome,
            BigDecimal totalExpense,
            BigDecimal netSavings,
            BigDecimal savingsRatePct,
            List<CategorySlice> topExpenseCategories,
            List<Insight> insights
    ) {
    }
}
