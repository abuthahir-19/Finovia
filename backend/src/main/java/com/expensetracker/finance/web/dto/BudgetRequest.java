package com.expensetracker.finance.web.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record BudgetRequest(
        @NotNull @DecimalMin("0.01") BigDecimal monthlyBudget
) {}
