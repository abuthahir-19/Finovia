package com.expensetracker.finance.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {

    Optional<AppUser> findByFirebaseUid(String firebaseUid);

    /** Recipients for a scheduled digest run of the given cadence. */
    List<AppUser> findByDigestFrequency(DigestFrequency digestFrequency);
}
