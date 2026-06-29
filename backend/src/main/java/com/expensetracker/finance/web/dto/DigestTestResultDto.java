package com.expensetracker.finance.web.dto;

/** Result of the "send me a test digest now" action on the account page. */
public record DigestTestResultDto(boolean sent, boolean emailEnabled, String message) {
}
