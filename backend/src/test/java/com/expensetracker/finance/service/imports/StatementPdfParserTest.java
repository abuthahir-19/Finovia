package com.expensetracker.finance.service.imports;

import com.expensetracker.finance.domain.TransactionType;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/** Unit tests for the text-parsing heuristics (no PDF / Docker needed). */
class StatementPdfParserTest {

    private final StatementPdfParser parser = new StatementPdfParser();

    @Test
    void parsesGpayStyleExpenseAndIncomeLines() {
        String text = """
                Transaction details        Amount
                12 Apr 2024 Paid to Swiggy ₹450.50 Debit
                15 Apr 2024 Received from John Doe ₹1,200.00 Credit
                Apr 18, 2024 Paid to Uber ₹230 Debit
                """;

        ParseOutcome outcome = parser.parseText(text);

        assertThat(outcome.transactions()).hasSize(3);

        ParsedTransaction swiggy = outcome.transactions().get(0);
        assertThat(swiggy.type()).isEqualTo(TransactionType.EXPENSE);
        assertThat(swiggy.amount()).isEqualByComparingTo("450.50");
        assertThat(swiggy.currency()).isEqualTo("INR");
        assertThat(swiggy.description()).containsIgnoringCase("Swiggy");

        ParsedTransaction income = outcome.transactions().get(1);
        assertThat(income.type()).isEqualTo(TransactionType.INCOME);
        assertThat(income.amount()).isEqualByComparingTo("1200.00");
    }

    @Test
    void doesNotImportRowsWithoutADate() {
        String text = """
                Paid to Amazon ₹999.00 Debit
                """;

        ParseOutcome outcome = parser.parseText(text);

        assertThat(outcome.transactions()).isEmpty();
    }

    @Test
    void parsesGooglePayMultiLineBlocks() {
        // Mirrors how PDFBox extracts a Google Pay statement: each field on its own line,
        // plus a summary header that must NOT become a transaction.
        String text = """
                Transaction statement period
                01 May 2026 - 31 May 2026
                Sent
                ₹40,639.51
                Received
                ₹3,017
                Date & time Transaction details Amount
                01 May, 2026
                09:39 AM
                Paid to Ganapathi Mess
                UPI Transaction ID: 612139875143
                Paid by Kotak Mahindra Bank 6415
                ₹280
                16 May, 2026
                07:32 PM
                Received from SHAGUL IRFAN.A
                UPI Transaction ID: 613627244763
                Paid to Karur Vysya Bank 0626
                ₹2,000
                """;

        ParseOutcome outcome = parser.parseText(text);

        // Exactly two transactions — the ₹40,639.51 summary total is ignored.
        assertThat(outcome.transactions()).hasSize(2);

        ParsedTransaction expense = outcome.transactions().get(0);
        assertThat(expense.date()).isEqualTo(LocalDate.parse("2026-05-01"));
        assertThat(expense.type()).isEqualTo(TransactionType.EXPENSE);
        assertThat(expense.amount()).isEqualByComparingTo("280");
        assertThat(expense.currency()).isEqualTo("INR");
        assertThat(expense.description()).isEqualTo("Ganapathi Mess");

        ParsedTransaction income = outcome.transactions().get(1);
        assertThat(income.date()).isEqualTo(LocalDate.parse("2026-05-16"));
        assertThat(income.type()).isEqualTo(TransactionType.INCOME);
        assertThat(income.amount()).isEqualByComparingTo("2000");
        assertThat(income.description()).isEqualTo("SHAGUL IRFAN.A");
    }

    @Test
    void warnsWhenNothingDetected() {
        ParseOutcome outcome = parser.parseText("Statement summary\nThank you for using GPay");

        assertThat(outcome.transactions()).isEmpty();
        assertThat(outcome.warnings()).isNotEmpty();
    }
}
