package com.expensetracker.finance.web.dto;

import java.math.BigDecimal;

/** Lifetime account statistics shown on the profile / user dashboard. */
public record AccountStatsDto(
        long transactionCount,
        BigDecimal totalIncome,
        BigDecimal totalExpense,
        BigDecimal net,
        long goalCount,
        long activeGoalCount,
        long achievedGoalCount
) {
}
