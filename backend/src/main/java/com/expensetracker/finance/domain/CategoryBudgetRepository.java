package com.expensetracker.finance.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface CategoryBudgetRepository extends JpaRepository<CategoryBudget, Long> {
    List<CategoryBudget> findByUserId(Long userId);
    Optional<CategoryBudget> findByUserIdAndCategoryId(Long userId, Long categoryId);
    void deleteByUserIdAndCategoryId(Long userId, Long categoryId);
}
