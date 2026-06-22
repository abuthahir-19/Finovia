package com.expensetracker.finance.security;

/**
 * The authenticated identity extracted from a verified Firebase ID token.
 * Set as the Spring Security principal so controllers can inject it via
 * {@code @AuthenticationPrincipal}.
 */
public record FirebaseUserPrincipal(String uid, String email, String displayName) {
}
