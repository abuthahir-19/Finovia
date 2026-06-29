package com.expensetracker.finance.web.dto;

import java.math.BigDecimal;

public record BudgetStatusDto(
        Long       categoryId,
        String     categoryName,
        String     categoryColor,
        BigDecimal monthlyBudget,
        BigDecimal actualSpent,
        BigDecimal remaining,
        BigDecimal usedPct,
        String     status
) {}
