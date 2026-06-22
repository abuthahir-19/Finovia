package com.expensetracker.finance.domain.projection;

import java.math.BigDecimal;

/** Aggregation row: income & expense totals for one calendar month (yyyy-MM). */
public interface MonthlyTotal {
    String getPeriod();
    BigDecimal getIncome();
    BigDecimal getExpense();
}
