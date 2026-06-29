package com.expensetracker.finance.web.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @Size(max = 120) String displayName,

        @Pattern(regexp = "^[A-Za-z]{3}$", message = "currency must be a 3-letter code, e.g. INR")
        String baseCurrency,

        @Pattern(regexp = "^(NONE|WEEKLY|MONTHLY)$", message = "digestFrequency must be NONE, WEEKLY or MONTHLY")
        String digestFrequency
) {
}
