package com.expensetracker.finance.service;

import com.expensetracker.finance.domain.*;
import com.expensetracker.finance.domain.projection.CategoryTotal;
import com.expensetracker.finance.service.email.EmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.format.TextStyle;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Sends a budget-threshold alert email whenever an EXPENSE transaction causes a category
 * budget to cross 25 %, 50 %, 80 %, or 100 % of its monthly limit.
 *
 * <p>Each threshold fires at most once per category per calendar month — tracked via
 * {@code last_notified_pct} and {@code last_notified_month} on the budget row.
 *
 * <p>Runs {@link Async asynchronously} so it never adds latency to the HTTP response.
 */
@Service
public class BudgetAlertService {

    private static final Logger log = LoggerFactory.getLogger(BudgetAlertService.class);
    private static final int[] THRESHOLDS = {25, 50, 80, 100};

    private final CategoryBudgetRepository budgets;
    private final CategoryRepository       categories;
    private final TransactionRepository    transactions;
    private final AppUserRepository        users;
    private final EmailService             email;
    private final String                   publicUrl;

    public BudgetAlertService(CategoryBudgetRepository budgets,
                              CategoryRepository categories,
                              TransactionRepository transactions,
                              AppUserRepository users,
                              EmailService email,
                              @Value("${app.public-url:https://gcp-learning-acnt.web.app}") String publicUrl) {
        this.budgets      = budgets;
        this.categories   = categories;
        this.transactions = transactions;
        this.users        = users;
        this.email        = email;
        this.publicUrl    = publicUrl;
    }

    @Async
    @Transactional
    public void checkAndNotify(Long userId) {
        try {
            doCheckAndNotify(userId);
        } catch (Exception ex) {
            log.warn("Budget alert check failed for user {}: {}", userId, ex.getMessage());
        }
    }

    private void doCheckAndNotify(Long userId) {
        AppUser user = users.findById(userId).orElse(null);
        if (user == null) return;

        LocalDate now         = LocalDate.now();
        String  currentMonth  = String.format("%d-%02d", now.getYear(), now.getMonthValue());
        LocalDate from        = now.withDayOfMonth(1);
        LocalDate to          = now.withDayOfMonth(now.lengthOfMonth());

        List<CategoryBudget> userBudgets = budgets.findByUserId(userId);
        if (userBudgets.isEmpty()) return;

        Map<Long, BigDecimal> actuals = transactions
                .totalsByCategory(userId, TransactionType.EXPENSE, from, to)
                .stream()
                .filter(ct -> ct.getCategoryId() != null)
                .collect(Collectors.toMap(CategoryTotal::getCategoryId, CategoryTotal::getTotal));

        Map<Long, Category> categoryMap = categories.findVisibleTo(userId)
                .stream()
                .collect(Collectors.toMap(Category::getId, c -> c));

        List<AlertLine> alerts = new ArrayList<>();

        for (CategoryBudget budget : userBudgets) {
            Category cat = categoryMap.get(budget.getCategoryId());
            if (cat == null) continue;

            BigDecimal actual    = actuals.getOrDefault(budget.getCategoryId(), BigDecimal.ZERO);
            BigDecimal budgetAmt = budget.getMonthlyBudget();
            if (budgetAmt.signum() <= 0) continue;

            // Reset tracking when a new month starts
            if (!currentMonth.equals(budget.getLastNotifiedMonth())) {
                budget.setLastNotifiedPct(0);
            }

            int usedInt = actual.multiply(BigDecimal.valueOf(100))
                    .divide(budgetAmt, 0, RoundingMode.FLOOR)
                    .intValue();

            int currentNotified   = budget.getLastNotifiedPct();
            int highestNewThreshold = 0;
            for (int t : THRESHOLDS) {
                if (usedInt >= t && currentNotified < t) {
                    highestNewThreshold = t;
                }
            }

            if (highestNewThreshold > 0) {
                budget.setLastNotifiedPct(highestNewThreshold);
                budget.setLastNotifiedMonth(currentMonth);
                budgets.save(budget);
                alerts.add(new AlertLine(
                        cat.getName(),
                        cat.getColor() != null ? cat.getColor() : "#94a3b8",
                        budgetAmt, actual, highestNewThreshold));
            }
        }

        if (alerts.isEmpty()) return;

        String month   = now.getMonth().getDisplayName(TextStyle.FULL, Locale.ENGLISH) + " " + now.getYear();
        String name    = user.getDisplayName() != null && !user.getDisplayName().isBlank()
                         ? user.getDisplayName() : user.getEmail().split("@")[0];
        String subject = alerts.size() == 1
                ? "Budget alert: " + alerts.get(0).categoryName() + " at " + alerts.get(0).threshold() + "%"
                : alerts.size() + " budget alerts for " + month;

        email.sendHtml(user.getEmail(), subject, buildHtml(alerts, name, month));
        log.info("Budget alert sent to {} — {} categor{}", user.getEmail(),
                alerts.size(), alerts.size() == 1 ? "y" : "ies");
    }

    // ── HTML builder ──────────────────────────────────────────────────────────

    private String buildHtml(List<AlertLine> alerts, String name, String month) {
        StringBuilder alertRows = new StringBuilder();
        for (AlertLine a : alerts) {
            alertRows.append(alertRow(a));
        }

        return "<!DOCTYPE html><html lang='en'><head>"
             + "<meta charset='UTF-8'>"
             + "<meta name='viewport' content='width=device-width,initial-scale=1.0'>"
             + "</head><body style='margin:0;padding:0;background:#f1f5f9;"
             + "font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,sans-serif'>"
             + "<table width='100%' cellpadding='0' cellspacing='0'><tr>"
             + "<td align='center' style='padding:32px 16px'>"
             + "<table width='100%' style='max-width:560px;background:#ffffff;"
             + "border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)'>"

             // Header
             + "<tr><td style='background:linear-gradient(135deg,#4f46e5 0%,#6366f1 100%);"
             + "padding:28px 32px;text-align:center'>"
             + "<div style='font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.02em'>Finovia</div>"
             + "<div style='font-size:13px;color:rgba(255,255,255,0.75);margin-top:4px'>Budget Alert</div>"
             + "</td></tr>"

             // Intro
             + "<tr><td style='padding:28px 32px 12px'>"
             + "<p style='margin:0;font-size:16px;font-weight:600;color:#0f172a'>Hey " + esc(name) + ",</p>"
             + "<p style='margin:10px 0 0;font-size:14px;color:#64748b;line-height:1.6'>"
             + "You've reached a spending milestone in <strong>" + esc(month) + "</strong>."
             + " Here's a quick heads-up:</p>"
             + "</td></tr>"

             // Alert rows
             + alertRows

             // CTA footer
             + "<tr><td style='padding:24px 32px;border-top:1px solid #f1f5f9;text-align:center'>"
             + "<a href='" + publicUrl + "/budgets' style='display:inline-block;background:#4f46e5;"
             + "color:#fff;text-decoration:none;font-size:14px;font-weight:600;"
             + "padding:11px 28px;border-radius:10px'>View Budgets →</a>"
             + "<p style='margin:16px 0 0;font-size:12px;color:#94a3b8'>"
             + "Budget alerts from Finovia — your personal finance tracker.</p>"
             + "</td></tr>"

             + "</table></td></tr></table></body></html>";
    }

    private String alertRow(AlertLine a) {
        double  pct        = a.actual().doubleValue() / a.budget().doubleValue() * 100;
        int     barPct     = (int) Math.min(pct, 100);
        boolean isOver     = a.threshold() == 100;
        boolean isWarning  = a.threshold() == 80;

        String chipBg      = isOver    ? "#fee2e2" : isWarning ? "#fef3c7" : "#fef9c3";
        String chipColor   = isOver    ? "#dc2626" : isWarning ? "#d97706" : "#92400e";
        String barColor    = isOver    ? "#ef4444" : isWarning ? "#f59e0b" : "#10b981";
        String threshLabel = isOver    ? "Over budget" : a.threshold() + "% reached";

        BigDecimal remaining = a.budget().subtract(a.actual());
        String remainText    = isOver
                ? fmt(remaining.abs()) + " over budget"
                : fmt(remaining) + " remaining";

        return "<tr><td style='padding:16px 32px'>"
             + "<table width='100%' cellpadding='0' cellspacing='0'><tr>"
             // Category name + chip
             + "<td style='font-size:15px;font-weight:600;color:#0f172a'>" + esc(a.categoryName()) + "</td>"
             + "<td align='right'>"
             + "<span style='font-size:11px;font-weight:700;padding:3px 10px;border-radius:99px;"
             + "background:" + chipBg + ";color:" + chipColor + "'>" + threshLabel + "</span>"
             + "</td></tr>"
             // Progress bar
             + "<tr><td colspan='2' style='padding-top:10px'>"
             + "<div style='background:#f1f5f9;border-radius:99px;height:8px;overflow:hidden'>"
             + "<div style='width:" + barPct + "%;height:8px;background:" + barColor + ";border-radius:99px'></div>"
             + "</div></td></tr>"
             // Amount detail
             + "<tr><td style='padding-top:7px;font-size:12px;color:#64748b'>" + fmt(a.actual()) + " spent</td>"
             + "<td align='right' style='padding-top:7px;font-size:12px;color:#64748b'>"
             + (int) Math.round(pct) + "% of " + fmt(a.budget()) + " — " + remainText
             + "</td></tr>"
             + "</table></td></tr>"
             // Divider
             + "<tr><td style='padding:0 32px'><div style='height:1px;background:#f1f5f9'></div></td></tr>";
    }

    private static String fmt(BigDecimal amount) {
        NumberFormat nf = NumberFormat.getCurrencyInstance(Locale.of("en", "IN"));
        nf.setMaximumFractionDigits(2);
        return nf.format(amount);
    }

    private static String esc(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }

    private record AlertLine(String categoryName, String categoryColor,
                             BigDecimal budget, BigDecimal actual, int threshold) {}
}
