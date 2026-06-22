package com.expensetracker.finance.web;

import com.expensetracker.finance.security.FirebaseUserPrincipal;
import com.expensetracker.finance.service.AnalyticsService;
import com.expensetracker.finance.service.CurrentUserService;
import com.expensetracker.finance.web.dto.AnalyticsDtos.CategorySlice;
import com.expensetracker.finance.web.dto.AnalyticsDtos.LastSalary;
import com.expensetracker.finance.web.dto.AnalyticsDtos.MonthlyPoint;
import com.expensetracker.finance.web.dto.AnalyticsDtos.SavingsPoint;
import com.expensetracker.finance.web.dto.AnalyticsDtos.Summary;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final AnalyticsService analytics;
    private final CurrentUserService currentUser;

    public AnalyticsController(AnalyticsService analytics, CurrentUserService currentUser) {
        this.analytics = analytics;
        this.currentUser = currentUser;
    }

    @GetMapping("/summary")
    public Summary summary(@AuthenticationPrincipal FirebaseUserPrincipal principal,
                           @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                           @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return analytics.summary(currentUser.resolveId(principal), from, to);
    }

    @GetMapping("/last-salary")
    public ResponseEntity<LastSalary> lastSalary(
            @AuthenticationPrincipal FirebaseUserPrincipal principal) {
        return analytics.lastSalary(currentUser.resolveId(principal))
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @GetMapping("/spend-by-category")
    public List<CategorySlice> spendByCategory(
            @AuthenticationPrincipal FirebaseUserPrincipal principal,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return analytics.spendByCategory(currentUser.resolveId(principal), from, to);
    }

    @GetMapping("/income-vs-expense")
    public List<MonthlyPoint> incomeVsExpense(
            @AuthenticationPrincipal FirebaseUserPrincipal principal,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return analytics.incomeVsExpense(currentUser.resolveId(principal), from, to);
    }

    @GetMapping("/savings-trend")
    public List<SavingsPoint> savingsTrend(
            @AuthenticationPrincipal FirebaseUserPrincipal principal,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return analytics.savingsTrend(currentUser.resolveId(principal), from, to);
    }
}
