package com.expensetracker.finance.service;

import com.expensetracker.finance.domain.*;
import com.expensetracker.finance.domain.projection.CategoryTotal;
import com.expensetracker.finance.web.ResourceNotFoundException;
import com.expensetracker.finance.web.dto.BudgetStatusDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class BudgetService {

    private final CategoryBudgetRepository budgets;
    private final CategoryRepository       categories;
    private final TransactionRepository    transactions;

    public BudgetService(CategoryBudgetRepository budgets,
                         CategoryRepository categories,
                         TransactionRepository transactions) {
        this.budgets      = budgets;
        this.categories   = categories;
        this.transactions = transactions;
    }

    @Transactional(readOnly = true)
    public List<BudgetStatusDto> getBudgetStatus(Long userId, LocalDate from, LocalDate to) {
        List<CategoryBudget> userBudgets = budgets.findByUserId(userId);
        if (userBudgets.isEmpty()) return List.of();

        Map<Long, BigDecimal> actualByCategory = transactions
                .totalsByCategory(userId, TransactionType.EXPENSE, from, to)
                .stream()
                .filter(ct -> ct.getCategoryId() != null)
                .collect(Collectors.toMap(CategoryTotal::getCategoryId, CategoryTotal::getTotal));

        Map<Long, Category> categoryMap = categories.findVisibleTo(userId)
                .stream()
                .collect(Collectors.toMap(Category::getId, c -> c));

        return userBudgets.stream()
                .map(b -> {
                    Category cat = categoryMap.get(b.getCategoryId());
                    if (cat == null) return null;
                    BigDecimal actual = actualByCategory.getOrDefault(b.getCategoryId(), BigDecimal.ZERO);
                    return buildDto(cat, b.getMonthlyBudget(), actual);
                })
                .filter(Objects::nonNull)
                .sorted(Comparator.comparing(BudgetStatusDto::usedPct).reversed())
                .toList();
    }

    @Transactional
    public BudgetStatusDto setBudget(Long userId, Long categoryId, BigDecimal amount) {
        Category cat = categories.findVisibleTo(userId).stream()
                .filter(c -> c.getId().equals(categoryId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + categoryId));

        CategoryBudget budget = budgets.findByUserIdAndCategoryId(userId, categoryId)
                .orElse(null);
        if (budget == null) {
            budget = new CategoryBudget(userId, categoryId, amount);
        } else {
            budget.setMonthlyBudget(amount);
        }
        budgets.save(budget);

        LocalDate now  = LocalDate.now();
        LocalDate from = now.withDayOfMonth(1);
        LocalDate to   = now.withDayOfMonth(now.lengthOfMonth());

        BigDecimal actual = transactions
                .totalsByCategory(userId, TransactionType.EXPENSE, from, to)
                .stream()
                .filter(ct -> categoryId.equals(ct.getCategoryId()))
                .map(CategoryTotal::getTotal)
                .findFirst()
                .orElse(BigDecimal.ZERO);

        return buildDto(cat, amount, actual);
    }

    @Transactional
    public void deleteBudget(Long userId, Long categoryId) {
        budgets.findByUserIdAndCategoryId(userId, categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Budget not found for category: " + categoryId));
        budgets.deleteByUserIdAndCategoryId(userId, categoryId);
    }

    private BudgetStatusDto buildDto(Category cat, BigDecimal budget, BigDecimal actual) {
        BigDecimal remaining = budget.subtract(actual);
        BigDecimal usedPct   = budget.signum() > 0
                ? actual.divide(budget, 4, RoundingMode.HALF_UP)
                         .multiply(BigDecimal.valueOf(100))
                         .setScale(1, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        String status;
        if      (usedPct.compareTo(BigDecimal.valueOf(100)) >= 0) status = "over";
        else if (usedPct.compareTo(BigDecimal.valueOf(80))  >= 0) status = "warning";
        else                                                       status = "ok";

        String color = cat.getColor() != null ? cat.getColor() : "#94a3b8";
        return new BudgetStatusDto(
                cat.getId(), cat.getName(), color,
                budget, actual, remaining, usedPct, status);
    }
}
