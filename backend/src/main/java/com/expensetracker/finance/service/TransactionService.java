package com.expensetracker.finance.service;

import com.expensetracker.finance.domain.Transaction;
import com.expensetracker.finance.domain.TransactionRepository;
import com.expensetracker.finance.web.ResourceNotFoundException;
import com.expensetracker.finance.web.dto.TransactionDto;
import com.expensetracker.finance.web.dto.TransactionRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class TransactionService {

    private final TransactionRepository transactions;

    public TransactionService(TransactionRepository transactions) {
        this.transactions = transactions;
    }

    @Transactional(readOnly = true)
    public List<TransactionDto> list(Long userId, LocalDate from, LocalDate to) {
        List<Transaction> rows = (from != null && to != null)
                ? transactions.findByUserIdAndOccurredOnBetweenOrderByOccurredOnDesc(userId, from, to)
                : transactions.findByUserIdOrderByOccurredOnDesc(userId);
        return rows.stream().map(TransactionDto::from).toList();
    }

    @Transactional
    public TransactionDto create(Long userId, TransactionRequest req) {
        Transaction t = new Transaction(
                userId, req.categoryId(), req.type(), req.amount(),
                normalizeCurrency(req.currency()), req.description(), req.occurredOn());
        return TransactionDto.from(transactions.save(t));
    }

    @Transactional
    public TransactionDto update(Long userId, Long id, TransactionRequest req) {
        Transaction t = transactions.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found: " + id));
        t.setType(req.type());
        t.setAmount(req.amount());
        t.setCategoryId(req.categoryId());
        t.setCurrency(normalizeCurrency(req.currency()));
        t.setDescription(req.description());
        t.setOccurredOn(req.occurredOn());
        t.touch();
        return TransactionDto.from(transactions.save(t));
    }

    @Transactional
    public void delete(Long userId, Long id) {
        Transaction t = transactions.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found: " + id));
        transactions.delete(t);
    }

    private static String normalizeCurrency(String currency) {
        return (currency == null || currency.isBlank()) ? "INR" : currency.toUpperCase();
    }
}
