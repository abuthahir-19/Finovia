package com.expensetracker.finance.web.dto;

/** Outcome of a scheduled digest run, returned to the trigger (e.g. Cloud Scheduler). */
public record DigestRunResultDto(String frequency, int recipients, int sent, int skipped) {
}
