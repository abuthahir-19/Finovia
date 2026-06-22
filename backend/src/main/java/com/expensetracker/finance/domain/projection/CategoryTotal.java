package com.expensetracker.finance.domain.projection;

import java.math.BigDecimal;

/** Aggregation row: total spend/income for one category. */
public interface CategoryTotal {
    Long getCategoryId();
    String getCategoryName();
    String getColor();
    BigDecimal getTotal();
}
