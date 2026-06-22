package com.expensetracker.finance.service.imports;

import com.expensetracker.finance.domain.TransactionType;

import java.math.BigDecimal;
import java.time.LocalDate;

/** A single transaction candidate extracted from a statement line. */
public record ParsedTransaction(
        LocalDate date,
        TransactionType type,
        BigDecimal amount,
        String currency,
        String description
) {
}
