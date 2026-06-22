package com.expensetracker.finance.web.dto;

import java.util.List;

/** Summary returned after importing a statement PDF. */
public record StatementImportResultDto(
        int importedCount,
        int skippedCount,
        List<TransactionDto> imported,
        List<String> warnings
) {
}
