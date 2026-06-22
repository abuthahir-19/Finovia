package com.expensetracker.finance.service;

import com.expensetracker.finance.domain.AppUser;
import com.expensetracker.finance.domain.AppUserRepository;
import com.expensetracker.finance.security.FirebaseUserPrincipal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Resolves the {@link AppUser} row for the authenticated Firebase principal,
 * provisioning it on first contact (just-in-time user creation).
 */
@Service
public class CurrentUserService {

    private final AppUserRepository users;

    public CurrentUserService(AppUserRepository users) {
        this.users = users;
    }

    @Transactional
    public AppUser resolve(FirebaseUserPrincipal principal) {
        return users.findByFirebaseUid(principal.uid())
                .orElseGet(() -> users.save(new AppUser(
                        principal.uid(),
                        principal.email() == null ? principal.uid() + "@unknown" : principal.email(),
                        principal.displayName())));
    }

    @Transactional
    public Long resolveId(FirebaseUserPrincipal principal) {
        return resolve(principal).getId();
    }
}
