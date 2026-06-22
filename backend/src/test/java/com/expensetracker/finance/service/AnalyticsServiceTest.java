package com.expensetracker.finance.service;

import com.expensetracker.finance.domain.AppUser;
import com.expensetracker.finance.domain.AppUserRepository;
import com.expensetracker.finance.domain.Transaction;
import com.expensetracker.finance.domain.TransactionRepository;
import com.expensetracker.finance.domain.TransactionType;
import com.expensetracker.finance.support.DockerAvailableCondition;
import com.expensetracker.finance.web.dto.AnalyticsDtos.Summary;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration test against a real PostgreSQL (Testcontainers), exercising the
 * native aggregation queries and the savings-rate insight logic.
 */
@DataJpaTest(properties = "spring.jpa.hibernate.ddl-auto=none")
@Testcontainers
@ExtendWith({DockerAvailableCondition.class, SpringExtension.class})
class AnalyticsServiceTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.flyway.enabled", () -> "true");
    }

    @Autowired
    TransactionRepository transactions;

    @Autowired
    AppUserRepository users;

    @Autowired
    com.expensetracker.finance.domain.CategoryRepository categories;

    @Test
    void summaryComputesSavingsRateAndNet() {
        Long userId = users.save(new AppUser("uid-1", "user@example.com", "Test User")).getId();
        transactions.save(new Transaction(userId, null, TransactionType.INCOME,
                new BigDecimal("5000.00"), "USD", "Salary", LocalDate.parse("2026-06-01")));
        transactions.save(new Transaction(userId, null, TransactionType.EXPENSE,
                new BigDecimal("2000.00"), "USD", "Rent", LocalDate.parse("2026-06-03")));

        AnalyticsService analytics = new AnalyticsService(transactions, categories);
        Summary summary = analytics.summary(userId,
                LocalDate.parse("2026-06-01"), LocalDate.parse("2026-06-30"));

        assertThat(summary.totalIncome()).isEqualByComparingTo("5000.00");
        assertThat(summary.totalExpense()).isEqualByComparingTo("2000.00");
        assertThat(summary.netSavings()).isEqualByComparingTo("3000.00");
        assertThat(summary.savingsRatePct()).isEqualByComparingTo("60.00");
        assertThat(summary.insights()).anyMatch(i -> i.severity().equals("success"));
    }
}
