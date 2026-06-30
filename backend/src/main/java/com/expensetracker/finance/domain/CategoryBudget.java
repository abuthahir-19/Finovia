package com.expensetracker.finance.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "category_budget", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"user_id", "category_id"})
})
public class CategoryBudget {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "category_id", nullable = false)
    private Long categoryId;

    @Column(name = "monthly_budget", nullable = false, precision = 14, scale = 2)
    private BigDecimal monthlyBudget;

    @Column(name = "last_notified_pct", nullable = false)
    private int lastNotifiedPct = 0;

    @Column(name = "last_notified_month", length = 7)
    private String lastNotifiedMonth;

    protected CategoryBudget() {}

    public CategoryBudget(Long userId, Long categoryId, BigDecimal monthlyBudget) {
        this.userId = userId;
        this.categoryId = categoryId;
        this.monthlyBudget = monthlyBudget;
    }

    public Long getId()                    { return id; }
    public Long getUserId()                { return userId; }
    public Long getCategoryId()            { return categoryId; }
    public BigDecimal getMonthlyBudget()   { return monthlyBudget; }
    public void setMonthlyBudget(BigDecimal monthlyBudget) { this.monthlyBudget = monthlyBudget; }

    public int getLastNotifiedPct()                   { return lastNotifiedPct; }
    public void setLastNotifiedPct(int pct)           { this.lastNotifiedPct = pct; }
    public String getLastNotifiedMonth()              { return lastNotifiedMonth; }
    public void setLastNotifiedMonth(String month)    { this.lastNotifiedMonth = month; }
}
