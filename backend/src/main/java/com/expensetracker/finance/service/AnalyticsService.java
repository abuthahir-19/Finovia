package com.expensetracker.finance.service;

import com.expensetracker.finance.domain.Category;
import com.expensetracker.finance.domain.CategoryRepository;
import com.expensetracker.finance.domain.Transaction;
import com.expensetracker.finance.domain.TransactionRepository;
import com.expensetracker.finance.domain.TransactionType;
import com.expensetracker.finance.domain.projection.CategoryTotal;
import com.expensetracker.finance.domain.projection.MonthlyTotal;
import com.expensetracker.finance.web.dto.AnalyticsDtos.CategorySlice;
import com.expensetracker.finance.web.dto.AnalyticsDtos.Insight;
import com.expensetracker.finance.web.dto.AnalyticsDtos.LastSalary;
import com.expensetracker.finance.web.dto.AnalyticsDtos.MonthlyPoint;
import com.expensetracker.finance.web.dto.AnalyticsDtos.SavingsPoint;
import com.expensetracker.finance.web.dto.AnalyticsDtos.Summary;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Computes chart-ready aggregates and rule-based budgeting insights.
 * All queries are scoped by {@code userId} for tenant isolation.
 */
@Service
@Transactional(readOnly = true)
public class AnalyticsService {

    /** Common 50/30/20 budgeting heuristic: savings rate target. */
    private static final BigDecimal HEALTHY_SAVINGS_RATE = BigDecimal.valueOf(20);
    /** Flag any single expense category exceeding this share of total spend. */
    private static final BigDecimal CATEGORY_CONCENTRATION_PCT = BigDecimal.valueOf(35);

    private final TransactionRepository transactions;
    private final CategoryRepository categories;

    public AnalyticsService(TransactionRepository transactions, CategoryRepository categories) {
        this.transactions = transactions;
        this.categories = categories;
    }

    public List<CategorySlice> spendByCategory(Long userId, LocalDate from, LocalDate to) {
        return transactions.totalsByCategory(userId, TransactionType.EXPENSE, from, to).stream()
                .map(AnalyticsService::toSlice)
                .toList();
    }

    public List<MonthlyPoint> incomeVsExpense(Long userId, LocalDate from, LocalDate to) {
        return transactions.monthlyTotals(userId, from, to).stream()
                .map(m -> new MonthlyPoint(
                        m.getPeriod(), m.getIncome(), m.getExpense(),
                        m.getIncome().subtract(m.getExpense())))
                .toList();
    }

    /** Cumulative running net savings (income - expense) over the window, by month. */
    public List<SavingsPoint> savingsTrend(Long userId, LocalDate from, LocalDate to) {
        List<SavingsPoint> points = new ArrayList<>();
        BigDecimal running = BigDecimal.ZERO;
        for (MonthlyTotal m : transactions.monthlyTotals(userId, from, to)) {
            running = running.add(m.getIncome().subtract(m.getExpense()));
            points.add(new SavingsPoint(m.getPeriod(), running));
        }
        return points;
    }

    /**
     * The user's most recent salary, used to anchor the pay-period view. Prefers an income
     * tagged "Salary"; if none exists, falls back to the most recent income of any kind so the
     * pay-period view still works for un-categorized / imported paychecks.
     */
    public Optional<LastSalary> lastSalary(Long userId) {
        var page = PageRequest.of(0, 1);

        List<Long> salaryCategoryIds = categories.findVisibleTo(userId).stream()
                .filter(c -> c.getKind() == TransactionType.INCOME
                        && "salary".equalsIgnoreCase(c.getName()))
                .map(Category::getId)
                .toList();

        List<Transaction> source = salaryCategoryIds.isEmpty()
                ? List.of()
                : transactions.findRecentByCategoryIds(userId, salaryCategoryIds, page);
        if (source.isEmpty()) {
            // Fallback so the pay-period view still works for un-categorized / imported income.
            source = transactions.findRecentIncome(userId, page);
        }
        return source.stream()
                .findFirst()
                .map(t -> new LastSalary(t.getOccurredOn(), t.getAmount()));
    }

    public Summary summary(Long userId, LocalDate from, LocalDate to) {
        BigDecimal income = transactions.sumByType(userId, TransactionType.INCOME, from, to);
        BigDecimal expense = transactions.sumByType(userId, TransactionType.EXPENSE, from, to);
        BigDecimal net = income.subtract(expense);

        BigDecimal savingsRate = income.signum() > 0
                ? net.divide(income, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100))
                : BigDecimal.ZERO;

        List<CategorySlice> byCategory = spendByCategory(userId, from, to);
        List<CategorySlice> top = byCategory.stream().limit(5).toList();

        return new Summary(income, expense, net, savingsRate, top,
                buildInsights(income, expense, net, savingsRate, expense, byCategory));
    }

    /**
     * Rule-based insights modeled on common real-life budgeting scenarios.
     * Each rule is intentionally simple and explainable.
     */
    private List<Insight> buildInsights(BigDecimal income, BigDecimal expense, BigDecimal net,
                                        BigDecimal savingsRate, BigDecimal totalExpense,
                                        List<CategorySlice> byCategory) {
        List<Insight> insights = new ArrayList<>();

        // 1. Spending more than earning.
        if (net.signum() < 0) {
            insights.add(new Insight("danger", "You're overspending",
                    "Expenses exceeded income by " + money(net.abs())
                            + " this period. Consider trimming discretionary categories."));
        }

        // 2. Savings rate below the healthy threshold.
        if (income.signum() > 0 && savingsRate.compareTo(HEALTHY_SAVINGS_RATE) < 0 && net.signum() >= 0) {
            insights.add(new Insight("warning", "Low savings rate",
                    "You saved " + savingsRate.setScale(0, RoundingMode.HALF_UP)
                            + "% of income. Aim for at least 20% (the 50/30/20 rule)."));
        }

        // 3. Over-concentration in a single expense category.
        if (totalExpense.signum() > 0 && !byCategory.isEmpty()) {
            CategorySlice topCat = byCategory.get(0);
            BigDecimal share = topCat.total()
                    .divide(totalExpense, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
            if (share.compareTo(CATEGORY_CONCENTRATION_PCT) > 0) {
                insights.add(new Insight("info", "Spending concentration",
                        topCat.category() + " is " + share.setScale(0, RoundingMode.HALF_UP)
                                + "% of your spending. Watch this category for savings opportunities."));
            }
        }

        // 4. Healthy month — positive reinforcement.
        if (income.signum() > 0 && savingsRate.compareTo(HEALTHY_SAVINGS_RATE) >= 0) {
            insights.add(new Insight("success", "On track",
                    "Great job — you saved " + savingsRate.setScale(0, RoundingMode.HALF_UP)
                            + "% of your income this period."));
        }

        // 5. No data yet.
        if (income.signum() == 0 && expense.signum() == 0) {
            insights.add(new Insight("info", "Add your first entries",
                    "Log some income and expenses to unlock personalized insights."));
        }

        return insights;
    }

    private static CategorySlice toSlice(CategoryTotal row) {
        return new CategorySlice(row.getCategoryId(), row.getCategoryName(), row.getTotal(),
                row.getColor() == null ? "#94a3b8" : row.getColor());
    }

    private static String money(BigDecimal value) {
        return "$" + value.setScale(2, RoundingMode.HALF_UP);
    }
}
