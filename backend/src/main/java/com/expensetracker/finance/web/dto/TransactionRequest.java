package com.expensetracker.finance.web.dto;

import com.expensetracker.finance.domain.TransactionType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record TransactionRequest(
        @NotNull TransactionType type,

        @NotNull
        @DecimalMin(value = "0.01", message = "amount must be positive")
        @Digits(integer = 12, fraction = 2)
        BigDecimal amount,

        Long categoryId,

        @Size(max = 3) String currency,

        @Size(max = 255) String description,

        @NotNull @PastOrPresent LocalDate occurredOn
) {
}
