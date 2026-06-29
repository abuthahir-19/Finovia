package com.expensetracker.finance.service.email;

import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;

/**
 * Thin wrapper over {@link JavaMailSender} for transactional HTML email.
 *
 * <p>Email is optional: when no SMTP is configured (no {@code spring.mail.host}, so no
 * {@code JavaMailSender} bean) or {@code app.mail.enabled=false}, sends are skipped and logged
 * rather than failing — so the app runs fine locally without an email provider.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    /** Default placeholder; not a real verified sender, so treated as "not configured". */
    private static final String PLACEHOLDER_FROM = "no-reply@finovia.app";

    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final boolean enabled;
    private final String from;
    private final String fromName;

    public EmailService(ObjectProvider<JavaMailSender> mailSenderProvider,
                        @Value("${app.mail.enabled:false}") boolean enabled,
                        @Value("${app.mail.from:no-reply@finovia.app}") String from,
                        @Value("${app.mail.from-name:Finovia}") String fromName) {
        this.mailSenderProvider = mailSenderProvider;
        this.enabled = enabled;
        this.from = from;
        this.fromName = fromName;
    }

    /** Whether email is fully configured and ready to send (flag + sender bean + valid From). */
    public boolean isReady() {
        return configurationProblem() == null;
    }

    /**
     * A human-readable reason email can't be sent, or {@code null} when ready. Lets callers
     * surface a precise message (e.g. on the "send test digest" action) instead of a generic one.
     */
    public String configurationProblem() {
        if (!enabled) {
            return "Email is disabled on the server (set MAIL_ENABLED=true).";
        }
        if (mailSenderProvider.getIfAvailable() == null) {
            return "No SMTP server is configured (set MAIL_HOST).";
        }
        if (!hasValidFrom()) {
            return "MAIL_FROM is not set to a verified sender address.";
        }
        return null;
    }

    private boolean hasValidFrom() {
        return from != null && !from.isBlank() && !from.equalsIgnoreCase(PLACEHOLDER_FROM);
    }

    /**
     * Sends an HTML email. Returns {@code true} if handed off to the SMTP server,
     * {@code false} if email is disabled/unconfigured or sending failed.
     *
     * <p>Note: a {@code true} result means the SMTP server accepted the message, not that it was
     * delivered — check your provider's logs for the final delivery status.
     */
    public boolean sendHtml(String to, String subject, String html) {
        if (to == null || to.isBlank()) {
            return false;
        }
        JavaMailSender sender = enabled ? mailSenderProvider.getIfAvailable() : null;
        if (sender == null) {
            log.info("Email disabled or not configured — skipping message to {} ('{}')", to, subject);
            return false;
        }
        // Fail fast: an unverified/placeholder From is accepted by some relays then silently
        // dropped, which looks like success but never arrives. Refuse rather than mislead.
        if (!hasValidFrom()) {
            log.warn("Refusing to send to {}: MAIL_FROM is unset or the placeholder ('{}'). "
                    + "Set MAIL_FROM to a sender address verified with your email provider.", to, PLACEHOLDER_FROM);
            return false;
        }
        try {
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, StandardCharsets.UTF_8.name());
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(html, true);
            try {
                helper.setFrom(from, fromName);
            } catch (Exception e) {
                helper.setFrom(from); // fall back if the display name can't be encoded
            }
            sender.send(message);
            log.info("Email handed to SMTP server: to={} from={} subject='{}'", to, from, subject);
            return true;
        } catch (Exception e) {
            log.warn("Failed to send email to {} ('{}'): {}", to, subject, e.getMessage());
            return false;
        }
    }
}
