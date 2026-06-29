package com.expensetracker.finance.service.digest;

import com.expensetracker.finance.domain.AppUser;
import com.expensetracker.finance.domain.AppUserRepository;
import com.expensetracker.finance.domain.DigestFrequency;
import com.expensetracker.finance.service.AnalyticsService;
import com.expensetracker.finance.service.email.EmailService;
import com.expensetracker.finance.web.dto.AnalyticsDtos.CategorySlice;
import com.expensetracker.finance.web.dto.AnalyticsDtos.Insight;
import com.expensetracker.finance.web.dto.AnalyticsDtos.Summary;
import com.expensetracker.finance.web.dto.DigestRunResultDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Currency;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Builds and sends the periodic (weekly / monthly) summary email. Content is computed by
 * {@link AnalyticsService} for the relevant window, so the digest matches the dashboard exactly.
 */
@Service
public class DigestService {

    private static final Logger log = LoggerFactory.getLogger(DigestService.class);

    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("MMM d", Locale.ENGLISH);
    private static final DateTimeFormatter MONTH = DateTimeFormatter.ofPattern("MMMM yyyy", Locale.ENGLISH);

    /** Severity → accent colour for insight rows. */
    private static final Map<String, String> SEVERITY_COLORS = Map.of(
            "success", "#059669",
            "info", "#0284c7",
            "warning", "#d97706",
            "danger", "#e11d48");

    private final AppUserRepository users;
    private final AnalyticsService analytics;
    private final EmailService email;
    private final String publicUrl;

    public DigestService(AppUserRepository users, AnalyticsService analytics, EmailService email,
                         @Value("${app.public-url:https://gcp-learning-acnt.web.app}") String publicUrl) {
        this.users = users;
        this.analytics = analytics;
        this.email = email;
        this.publicUrl = publicUrl;
    }

    /** Sends the digest to every user opted into the given cadence. */
    public DigestRunResultDto runDigests(DigestFrequency frequency) {
        if (frequency == null || frequency == DigestFrequency.NONE) {
            return new DigestRunResultDto(String.valueOf(frequency), 0, 0, 0);
        }
        List<AppUser> recipients = users.findByDigestFrequency(frequency);
        int sent = 0;
        for (AppUser user : recipients) {
            try {
                if (sendDigest(user, frequency, false)) {
                    sent++;
                }
            } catch (Exception e) {
                log.warn("Digest failed for user {}: {}", user.getId(), e.getMessage());
            }
        }
        log.info("Digest run [{}]: {}/{} sent", frequency, sent, recipients.size());
        return new DigestRunResultDto(frequency.name(), recipients.size(), sent, recipients.size() - sent);
    }

    /**
     * Builds and sends a single user's digest. When {@code allowEmpty} is false, users with no
     * activity in the period are skipped (no empty emails); the manual "send test" path passes true.
     * Returns whether the email was actually dispatched.
     */
    public boolean sendDigest(AppUser user, DigestFrequency frequency, boolean allowEmpty) {
        DigestPeriod period = periodFor(frequency, LocalDate.now());
        Summary summary = analytics.summary(user.getId(), period.from(), period.to());

        boolean empty = summary.totalIncome().signum() == 0 && summary.totalExpense().signum() == 0;
        if (empty && !allowEmpty) {
            return false;
        }

        String html = renderHtml(user, frequency, period, summary);
        boolean dispatched = email.sendHtml(user.getEmail(), period.subject(), html);
        if (dispatched) {
            user.setLastDigestSentAt(Instant.now());
            users.save(user); // SimpleJpaRepository.save is transactional; merges the detached user
        }
        return dispatched;
    }

    /* ----------------------------- period ----------------------------- */

    record DigestPeriod(LocalDate from, LocalDate to, String title, String label, String subject) {
    }

    static DigestPeriod periodFor(DigestFrequency frequency, LocalDate today) {
        if (frequency == DigestFrequency.MONTHLY) {
            LocalDate firstOfLastMonth = today.minusMonths(1).withDayOfMonth(1);
            LocalDate lastOfLastMonth = firstOfLastMonth.plusMonths(1).minusDays(1);
            String label = firstOfLastMonth.format(MONTH);
            return new DigestPeriod(firstOfLastMonth, lastOfLastMonth, "your monthly summary", label,
                    "Your monthly Finovia summary — " + label);
        }
        // WEEKLY (default): the trailing 7 days ending yesterday.
        LocalDate to = today.minusDays(1);
        LocalDate from = to.minusDays(6);
        String label = from.format(DAY) + " – " + to.format(DAY);
        return new DigestPeriod(from, to, "your weekly summary", label,
                "Your weekly Finovia summary — " + label);
    }

    /* ----------------------------- rendering ----------------------------- */

    private String renderHtml(AppUser user, DigestFrequency frequency, DigestPeriod period, Summary s) {
        String currency = user.getBaseCurrency();
        String name = (user.getDisplayName() != null && !user.getDisplayName().isBlank())
                ? user.getDisplayName().trim()
                : (user.getEmail() != null ? user.getEmail().split("@")[0] : "there");
        BigDecimal net = s.netSavings();
        String netColor = net.signum() < 0 ? "#e11d48" : "#059669";
        String rate = s.savingsRatePct().setScale(0, RoundingMode.HALF_UP) + "%";

        StringBuilder b = new StringBuilder(2048);
        b.append("<!doctype html><html><body style=\"margin:0;padding:0;background:#f1f5f9;\">");
        b.append("<div style=\"display:none;max-height:0;overflow:hidden;\">")
                .append("Your Finovia ").append(esc(period.label())).append(" summary.</div>");
        b.append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" "
                + "style=\"background:#f1f5f9;padding:24px 0;font-family:Inter,Arial,sans-serif;\"><tr><td align=\"center\">");
        b.append("<table role=\"presentation\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" "
                + "style=\"max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;"
                + "box-shadow:0 8px 24px rgba(16,24,40,0.06);\">");

        // Header band
        b.append("<tr><td style=\"background:linear-gradient(135deg,#4338ca,#6366f1);padding:24px 28px;\">")
                .append("<div style=\"color:#ffffff;font-size:18px;font-weight:700;\">Finovia</div>")
                .append("<div style=\"color:rgba(255,255,255,0.85);font-size:13px;margin-top:2px;\">")
                .append(cap(period.title())).append(" · ").append(esc(period.label())).append("</div>")
                .append("</td></tr>");

        // Greeting
        b.append("<tr><td style=\"padding:24px 28px 8px;\">")
                .append("<p style=\"margin:0;font-size:15px;color:#0f172a;\">Hi ").append(esc(name)).append(",</p>")
                .append("<p style=\"margin:8px 0 0;font-size:14px;color:#475569;line-height:1.5;\">")
                .append("Here's how your money moved over ").append(esc(period.label())).append(".</p>")
                .append("</td></tr>");

        // KPI grid (2x2)
        b.append("<tr><td style=\"padding:16px 20px;\"><table role=\"presentation\" width=\"100%\" "
                + "cellpadding=\"0\" cellspacing=\"0\"><tr>");
        b.append(kpiCell("Income", money(s.totalIncome(), currency), "#059669"));
        b.append(kpiCell("Expenses", money(s.totalExpense(), currency), "#e11d48"));
        b.append("</tr><tr>");
        b.append(kpiCell("Net savings", money(net, currency), netColor));
        b.append(kpiCell("Savings rate", rate, "#4f46e5"));
        b.append("</tr></table></td></tr>");

        // Top categories
        List<CategorySlice> top = s.topExpenseCategories();
        if (top != null && !top.isEmpty()) {
            b.append("<tr><td style=\"padding:8px 28px 4px;\">")
                    .append("<div style=\"font-size:13px;font-weight:600;color:#0f172a;margin-bottom:8px;\">"
                            + "Top spending categories</div>");
            BigDecimal max = top.get(0).total();
            for (CategorySlice c : top) {
                int pct = (max != null && max.signum() > 0)
                        ? c.total().multiply(BigDecimal.valueOf(100)).divide(max, 0, RoundingMode.HALF_UP).intValue()
                        : 0;
                b.append("<div style=\"margin-bottom:8px;\">")
                        .append("<table role=\"presentation\" width=\"100%\"><tr>")
                        .append("<td style=\"font-size:13px;color:#475569;\">").append(esc(c.category())).append("</td>")
                        .append("<td align=\"right\" style=\"font-size:13px;color:#0f172a;font-weight:600;\">")
                        .append(money(c.total(), currency)).append("</td></tr></table>")
                        .append("<div style=\"height:6px;background:#eef2ff;border-radius:99px;\">")
                        .append("<div style=\"height:6px;width:").append(pct).append("%;background:")
                        .append(esc(c.color() == null ? "#6366f1" : c.color()))
                        .append(";border-radius:99px;\"></div></div></div>");
            }
            b.append("</td></tr>");
        }

        // Insights
        List<Insight> insights = s.insights();
        if (insights != null && !insights.isEmpty()) {
            b.append("<tr><td style=\"padding:12px 28px 4px;\">")
                    .append("<div style=\"font-size:13px;font-weight:600;color:#0f172a;margin-bottom:8px;\">Insights</div>");
            insights.stream().limit(3).forEach(in -> {
                String color = SEVERITY_COLORS.getOrDefault(in.severity(), "#0284c7");
                b.append("<div style=\"border-left:3px solid ").append(color)
                        .append(";background:#f8fafc;padding:10px 12px;border-radius:8px;margin-bottom:8px;\">")
                        .append("<div style=\"font-size:13px;font-weight:600;color:#0f172a;\">").append(esc(in.title())).append("</div>")
                        .append("<div style=\"font-size:12px;color:#475569;margin-top:2px;line-height:1.4;\">")
                        .append(esc(in.message())).append("</div></div>");
            });
            b.append("</td></tr>");
        }

        // CTA
        b.append("<tr><td style=\"padding:16px 28px 24px;\" align=\"center\">")
                .append("<a href=\"").append(esc(publicUrl)).append("\" style=\"display:inline-block;background:#4f46e5;"
                        + "color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 22px;"
                        + "border-radius:10px;\">Open your dashboard</a></td></tr>");

        // Footer
        String cadence = frequency == DigestFrequency.MONTHLY ? "monthly" : "weekly";
        b.append("<tr><td style=\"padding:16px 28px;background:#f8fafc;border-top:1px solid #e7ebf3;\">")
                .append("<p style=\"margin:0;font-size:11px;color:#94a3b8;line-height:1.5;\">")
                .append("You're receiving this because you enabled ").append(cadence)
                .append(" email digests in Finovia. ")
                .append("<a href=\"").append(esc(publicUrl)).append("/profile\" style=\"color:#6366f1;\">")
                .append("Manage your preferences</a>.</p></td></tr>");

        b.append("</table></td></tr></table></body></html>");
        return b.toString();
    }

    private static String kpiCell(String label, String value, String color) {
        return "<td width=\"50%\" style=\"padding:6px;\">"
                + "<div style=\"background:#f8fafc;border:1px solid #e7ebf3;border-radius:12px;padding:14px 16px;\">"
                + "<div style=\"font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#94a3b8;\">"
                + esc(label) + "</div>"
                + "<div style=\"font-size:20px;font-weight:700;color:" + color + ";margin-top:4px;\">"
                + value + "</div></div></td>";
    }

    /* ----------------------------- helpers ----------------------------- */

    private static String money(BigDecimal value, String currencyCode) {
        BigDecimal v = value == null ? BigDecimal.ZERO : value;
        try {
            Locale locale = "INR".equalsIgnoreCase(currencyCode) ? Locale.of("en", "IN") : Locale.US;
            NumberFormat nf = NumberFormat.getNumberInstance(locale);
            nf.setMinimumFractionDigits(2);
            nf.setMaximumFractionDigits(2);
            return Currency.getInstance(currencyCode.toUpperCase()).getSymbol(locale) + nf.format(v);
        } catch (Exception e) {
            return currencyCode + " " + v.setScale(2, RoundingMode.HALF_UP);
        }
    }

    private static String cap(String s) {
        return s == null || s.isEmpty() ? s : Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }

    /** Minimal HTML escaping for user-supplied / category text embedded in the email. */
    private static String esc(String s) {
        if (s == null) {
            return "";
        }
        return s.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
