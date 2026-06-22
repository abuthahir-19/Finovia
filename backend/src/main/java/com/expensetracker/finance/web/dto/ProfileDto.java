package com.expensetracker.finance.web.dto;

import com.expensetracker.finance.domain.AppUser;

import java.time.Instant;

public record ProfileDto(
        Long id,
        String email,
        String displayName,
        String baseCurrency,
        Instant createdAt
) {
    public static ProfileDto from(AppUser u) {
        return new ProfileDto(u.getId(), u.getEmail(),
                u.getDisplayName() == null ? "" : u.getDisplayName(),
                u.getBaseCurrency(), u.getCreatedAt());
    }
}
