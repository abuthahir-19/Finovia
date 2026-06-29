package com.expensetracker.finance.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "app_user")
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "firebase_uid", nullable = false, unique = true, length = 128)
    private String firebaseUid;

    @Column(nullable = false)
    private String email;

    @Column(name = "display_name", length = 120)
    private String displayName;

    @Column(name = "base_currency", nullable = false, length = 3)
    private String baseCurrency = "INR";

    @Enumerated(EnumType.STRING)
    @Column(name = "digest_frequency", nullable = false, length = 10)
    private DigestFrequency digestFrequency = DigestFrequency.NONE;

    @Column(name = "last_digest_sent_at")
    private Instant lastDigestSentAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected AppUser() {
    }

    public AppUser(String firebaseUid, String email, String displayName) {
        this.firebaseUid = firebaseUid;
        this.email = email;
        this.displayName = displayName;
    }

    public Long getId() {
        return id;
    }

    public String getFirebaseUid() {
        return firebaseUid;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public String getBaseCurrency() {
        return baseCurrency;
    }

    public void setBaseCurrency(String baseCurrency) {
        this.baseCurrency = baseCurrency;
    }

    public DigestFrequency getDigestFrequency() {
        return digestFrequency;
    }

    public void setDigestFrequency(DigestFrequency digestFrequency) {
        this.digestFrequency = digestFrequency;
    }

    public Instant getLastDigestSentAt() {
        return lastDigestSentAt;
    }

    public void setLastDigestSentAt(Instant lastDigestSentAt) {
        this.lastDigestSentAt = lastDigestSentAt;
    }

    public void touch() {
        this.updatedAt = Instant.now();
    }
}
