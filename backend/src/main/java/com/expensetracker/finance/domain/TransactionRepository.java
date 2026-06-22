package com.expensetracker.finance.domain;

import com.expensetracker.finance.domain.projection.CategoryTotal;
import com.expensetracker.finance.domain.projection.MonthlyTotal;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    List<Transaction> findByUserIdAndOccurredOnBetweenOrderByOccurredOnDesc(
            Long userId, LocalDate from, LocalDate to);

    List<Transaction> findByUserIdOrderByOccurredOnDesc(Long userId);

    Optional<Transaction> findByIdAndUserId(Long id, Long userId);

    /** Spend grouped by category for a given type within a date window. */
    @Query("""
            SELECT c.id AS categoryId,
                   COALESCE(c.name, 'Uncategorized') AS categoryName,
                   c.color AS color,
                   SUM(t.amount) AS total
            FROM Transaction t
            LEFT JOIN Category c ON c.id = t.categoryId
            WHERE t.userId = :userId
              AND t.type = :type
              AND t.occurredOn BETWEEN :from AND :to
            GROUP BY c.id, c.name, c.color
            ORDER BY total DESC
            """)
    List<CategoryTotal> totalsByCategory(@Param("userId") Long userId,
                                         @Param("type") TransactionType type,
                                         @Param("from") LocalDate from,
                                         @Param("to") LocalDate to);

    /**
     * Monthly income vs expense totals. Uses native SQL for portable date truncation /
     * conditional aggregation against PostgreSQL.
     */
    @Query(value = """
            SELECT to_char(occurred_on, 'YYYY-MM') AS period,
                   COALESCE(SUM(amount) FILTER (WHERE type = 'INCOME'), 0)  AS income,
                   COALESCE(SUM(amount) FILTER (WHERE type = 'EXPENSE'), 0) AS expense
            FROM transaction
            WHERE user_id = :userId
              AND occurred_on BETWEEN :from AND :to
            GROUP BY period
            ORDER BY period
            """, nativeQuery = true)
    List<MonthlyTotal> monthlyTotals(@Param("userId") Long userId,
                                     @Param("from") LocalDate from,
                                     @Param("to") LocalDate to);

    @Query("""
            SELECT COALESCE(SUM(t.amount), 0)
            FROM Transaction t
            WHERE t.userId = :userId
              AND t.type = :type
              AND t.occurredOn BETWEEN :from AND :to
            """)
    BigDecimal sumByType(@Param("userId") Long userId,
                         @Param("type") TransactionType type,
                         @Param("from") LocalDate from,
                         @Param("to") LocalDate to);

    /** Most recent income(s) in the given categories (e.g. the "Salary" category), newest first. */
    @Query("""
            SELECT t FROM Transaction t
            WHERE t.userId = :userId
              AND t.type = com.expensetracker.finance.domain.TransactionType.INCOME
              AND t.categoryId IN :categoryIds
            ORDER BY t.occurredOn DESC
            """)
    List<Transaction> findRecentByCategoryIds(@Param("userId") Long userId,
                                              @Param("categoryIds") List<Long> categoryIds,
                                              Pageable pageable);

    long countByUserId(Long userId);

    /** Lifetime total for a transaction type (no date bounds), used by account stats. */
    @Query("""
            SELECT COALESCE(SUM(t.amount), 0)
            FROM Transaction t
            WHERE t.userId = :userId AND t.type = :type
            """)
    BigDecimal sumByTypeAllTime(@Param("userId") Long userId, @Param("type") TransactionType type);

    /** Fallback when nothing is tagged "Salary": the most recent income of any kind. */
    @Query("""
            SELECT t FROM Transaction t
            WHERE t.userId = :userId
              AND t.type = com.expensetracker.finance.domain.TransactionType.INCOME
            ORDER BY t.occurredOn DESC, t.amount DESC
            """)
    List<Transaction> findRecentIncome(@Param("userId") Long userId, Pageable pageable);
}
