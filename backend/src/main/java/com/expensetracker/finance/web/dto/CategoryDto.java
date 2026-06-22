package com.expensetracker.finance.web.dto;

import com.expensetracker.finance.domain.Category;
import com.expensetracker.finance.domain.TransactionType;

public record CategoryDto(
        Long id,
        String name,
        TransactionType kind,
        String color,
        String icon,
        boolean system
) {
    public static CategoryDto from(Category c) {
        return new CategoryDto(c.getId(), c.getName(), c.getKind(), c.getColor(),
                c.getIcon(), c.getUserId() == null);
    }
}
