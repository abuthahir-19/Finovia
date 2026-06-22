package com.expensetracker.finance.web.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record SavingsGoalRequest(
        @NotBlank @Size(max = 120) String name,

        @NotNull
        @DecimalMin(value = "0.01", message = "target must be positive")
        @Digits(integer = 12, fraction = 2)
        BigDecimal targetAmount,

        @PositiveOrZero
        @Digits(integer = 12, fraction = 2)
        BigDecimal currentAmount,

        LocalDate targetDate
) {
}
