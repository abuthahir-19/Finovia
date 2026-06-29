package com.expensetracker.finance.web;

import com.expensetracker.finance.domain.AppUser;
import com.expensetracker.finance.domain.DigestFrequency;
import com.expensetracker.finance.security.FirebaseUserPrincipal;
import com.expensetracker.finance.service.AccountService;
import com.expensetracker.finance.service.CurrentUserService;
import com.expensetracker.finance.service.digest.DigestService;
import com.expensetracker.finance.service.email.EmailService;
import com.expensetracker.finance.web.dto.AccountStatsDto;
import com.expensetracker.finance.web.dto.DigestTestResultDto;
import com.expensetracker.finance.web.dto.ProfileDto;
import com.expensetracker.finance.web.dto.UpdateProfileRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/me")
public class UserController {

    private final CurrentUserService currentUser;
    private final AccountService accountService;
    private final DigestService digestService;
    private final EmailService emailService;

    public UserController(CurrentUserService currentUser, AccountService accountService,
                          DigestService digestService, EmailService emailService) {
        this.currentUser = currentUser;
        this.accountService = accountService;
        this.digestService = digestService;
        this.emailService = emailService;
    }

    /** Returns (and provisions on first call) the current user's profile. */
    @GetMapping
    public ProfileDto me(@AuthenticationPrincipal FirebaseUserPrincipal principal) {
        return ProfileDto.from(currentUser.resolve(principal));
    }

    /** Updates the display name and/or base currency. */
    @PutMapping
    public ProfileDto update(@AuthenticationPrincipal FirebaseUserPrincipal principal,
                             @Valid @RequestBody UpdateProfileRequest body) {
        AppUser user = currentUser.resolve(principal);
        return accountService.updateProfile(user, body);
    }

    /** Lifetime statistics for the user dashboard. */
    @GetMapping("/stats")
    public AccountStatsDto stats(@AuthenticationPrincipal FirebaseUserPrincipal principal) {
        return accountService.stats(currentUser.resolveId(principal));
    }

    /**
     * Sends the current user a digest right now so they can preview it. Uses their chosen cadence
     * (or weekly if they haven't opted in) and includes the email even with no activity.
     */
    @PostMapping("/digest/test")
    public DigestTestResultDto sendTestDigest(@AuthenticationPrincipal FirebaseUserPrincipal principal) {
        String problem = emailService.configurationProblem();
        if (problem != null) {
            return new DigestTestResultDto(false, false, problem);
        }
        AppUser user = currentUser.resolve(principal);
        DigestFrequency freq = user.getDigestFrequency() == DigestFrequency.NONE
                ? DigestFrequency.WEEKLY
                : user.getDigestFrequency();
        boolean sent = digestService.sendDigest(user, freq, true);
        return new DigestTestResultDto(sent, true,
                sent ? "Test digest sent to " + user.getEmail() : "Couldn't send the test digest.");
    }
}
