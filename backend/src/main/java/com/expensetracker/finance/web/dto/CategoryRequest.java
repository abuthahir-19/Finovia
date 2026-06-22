package com.expensetracker.finance.web.dto;

import com.expensetracker.finance.domain.TransactionType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CategoryRequest(
        @NotBlank @Size(max = 80) String name,
        @NotNull TransactionType kind,
        @Pattern(regexp = "^#[0-9a-fA-F]{6}$", message = "color must be a hex code like #22c55e")
        String color,
        @Size(max = 40) String icon
) {
}
