package com.expensetracker.finance.web.dto;

import com.expensetracker.finance.domain.GoalStatus;
import com.expensetracker.finance.domain.SavingsGoal;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;

public record SavingsGoalDto(
        Long id,
        String name,
        BigDecimal targetAmount,
        BigDecimal currentAmount,
        BigDecimal progressPct,
        LocalDate targetDate,
        GoalStatus status
) {
    public static SavingsGoalDto from(SavingsGoal g) {
        BigDecimal pct = BigDecimal.ZERO;
        if (g.getTargetAmount() != null && g.getTargetAmount().signum() > 0) {
            pct = g.getCurrentAmount()
                    .divide(g.getTargetAmount(), 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .min(BigDecimal.valueOf(100));
        }
        return new SavingsGoalDto(g.getId(), g.getName(), g.getTargetAmount(),
                g.getCurrentAmount(), pct, g.getTargetDate(), g.getStatus());
    }
}
