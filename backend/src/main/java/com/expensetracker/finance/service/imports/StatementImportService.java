package com.expensetracker.finance.service.imports;

import com.expensetracker.finance.domain.AppUser;
import com.expensetracker.finance.domain.AppUserRepository;
import com.expensetracker.finance.domain.Category;
import com.expensetracker.finance.domain.CategoryRepository;
import com.expensetracker.finance.domain.Transaction;
import com.expensetracker.finance.domain.TransactionRepository;
import com.expensetracker.finance.web.dto.StatementImportResultDto;
import com.expensetracker.finance.web.dto.TransactionDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * Parses a statement PDF and auto-imports the detected transactions for a user.
 * Each row is categorized best-effort and saved; the result reports how many were
 * imported, how many transaction-like rows were skipped, and any warnings.
 */
@Service
public class StatementImportService {

    private final StatementPdfParser parser;
    private final TransactionRepository transactions;
    private final CategoryRepository categories;
    private final AppUserRepository users;

    public StatementImportService(StatementPdfParser parser,
                                  TransactionRepository transactions,
                                  CategoryRepository categories,
                                  AppUserRepository users) {
        this.parser = parser;
        this.transactions = transactions;
        this.categories = categories;
        this.users = users;
    }

    @Transactional
    public StatementImportResultDto importStatement(Long userId, byte[] pdfBytes, String password)
            throws IOException {
        ParseOutcome outcome = parser.parse(pdfBytes, password);

        String baseCurrency = users.findById(userId)
                .map(AppUser::getBaseCurrency)
                .orElse("USD");
        List<Category> visible = categories.findVisibleTo(userId);

        List<TransactionDto> imported = new ArrayList<>();
        for (ParsedTransaction p : outcome.transactions()) {
            Transaction entity = new Transaction(
                    userId,
                    CategoryGuesser.guess(p, visible),
                    p.type(),
                    p.amount(),
                    p.currency() != null ? p.currency() : baseCurrency,
                    p.description(),
                    p.date());
            imported.add(TransactionDto.from(transactions.save(entity)));
        }

        return new StatementImportResultDto(
                imported.size(), outcome.skipped(), imported, outcome.warnings());
    }
}
