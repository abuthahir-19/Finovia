package com.expensetracker.finance.web;

import com.expensetracker.finance.domain.DigestFrequency;
import com.expensetracker.finance.service.digest.DigestService;
import com.expensetracker.finance.web.dto.DigestRunResultDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Internal endpoint triggered by a scheduler (e.g. Google Cloud Scheduler) to fan out the
 * weekly / monthly digest. It is not user-authenticated; instead it is protected by a shared
 * secret in the {@code X-Digest-Token} header (matched against {@code app.digest.token}).
 *
 * <p>Permitted in {@code SecurityConfig} under {@code /api/internal/**}; the token check here is
 * the actual gate.
 */
@RestController
@RequestMapping("/api/internal/digests")
public class DigestController {

    private final DigestService digestService;
    private final String configuredToken;

    public DigestController(DigestService digestService,
                           @Value("${app.digest.token:}") String configuredToken) {
        this.digestService = digestService;
        this.configuredToken = configuredToken;
    }

    @PostMapping("/run")
    public DigestRunResultDto run(@RequestParam DigestFrequency frequency,
                                  @RequestHeader(value = "X-Digest-Token", required = false) String token) {
        // Trim both sides: secrets stored in Secret Manager often carry a trailing newline,
        // which Cloud Run feeds verbatim into the env var, while callers send the value without
        // it — a raw equals() would then mismatch (401) even with the "same" token.
        String expected = configuredToken == null ? "" : configuredToken.trim();
        if (expected.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Digest runs are disabled (no app.digest.token configured).");
        }
        String provided = token == null ? "" : token.trim();
        if (!expected.equals(provided)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid digest token.");
        }
        return digestService.runDigests(frequency);
    }
}
