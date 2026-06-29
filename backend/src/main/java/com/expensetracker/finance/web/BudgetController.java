package com.expensetracker.finance.web;

import com.expensetracker.finance.security.FirebaseUserPrincipal;
import com.expensetracker.finance.service.BudgetService;
import com.expensetracker.finance.service.CurrentUserService;
import com.expensetracker.finance.web.dto.BudgetRequest;
import com.expensetracker.finance.web.dto.BudgetStatusDto;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/budgets")
public class BudgetController {

    private final BudgetService     budgetService;
    private final CurrentUserService currentUser;

    public BudgetController(BudgetService budgetService, CurrentUserService currentUser) {
        this.budgetService = budgetService;
        this.currentUser   = currentUser;
    }

    @GetMapping
    public List<BudgetStatusDto> list(
            @AuthenticationPrincipal FirebaseUserPrincipal principal,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        LocalDate now          = LocalDate.now();
        LocalDate resolvedFrom = from != null ? from : now.withDayOfMonth(1);
        LocalDate resolvedTo   = to   != null ? to   : now.withDayOfMonth(now.lengthOfMonth());
        return budgetService.getBudgetStatus(currentUser.resolveId(principal), resolvedFrom, resolvedTo);
    }

    @PutMapping("/{categoryId}")
    public BudgetStatusDto set(
            @AuthenticationPrincipal FirebaseUserPrincipal principal,
            @PathVariable Long categoryId,
            @Valid @RequestBody BudgetRequest body) {
        return budgetService.setBudget(
                currentUser.resolveId(principal), categoryId, body.monthlyBudget());
    }

    @DeleteMapping("/{categoryId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @AuthenticationPrincipal FirebaseUserPrincipal principal,
            @PathVariable Long categoryId) {
        budgetService.deleteBudget(currentUser.resolveId(principal), categoryId);
    }
}
