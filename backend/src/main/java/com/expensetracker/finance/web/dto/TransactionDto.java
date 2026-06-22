package com.expensetracker.finance.web.dto;

import com.expensetracker.finance.domain.Transaction;
import com.expensetracker.finance.domain.TransactionType;

import java.math.BigDecimal;
import java.time.LocalDate;

public record TransactionDto(
        Long id,
        TransactionType type,
        BigDecimal amount,
        Long categoryId,
        String currency,
        String description,
        LocalDate occurredOn
) {
    public static TransactionDto from(Transaction t) {
        return new TransactionDto(t.getId(), t.getType(), t.getAmount(), t.getCategoryId(),
                t.getCurrency(), t.getDescription(), t.getOccurredOn());
    }
}
