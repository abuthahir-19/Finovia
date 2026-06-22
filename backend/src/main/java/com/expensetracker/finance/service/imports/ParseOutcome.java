package com.expensetracker.finance.service.imports;

import java.util.List;

/**
 * Result of parsing a statement: the transactions we extracted, the number of
 * transaction-like rows we couldn't fully parse, and any human-readable warnings.
 */
public record ParseOutcome(
        List<ParsedTransaction> transactions,
        int skipped,
        List<String> warnings
) {
}
