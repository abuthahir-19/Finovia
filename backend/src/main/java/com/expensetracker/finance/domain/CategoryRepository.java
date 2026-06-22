package com.expensetracker.finance.domain;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CategoryRepository extends JpaRepository<Category, Long> {

    /** Categories visible to a user: their own plus system defaults (user_id IS NULL). */
    @Query("SELECT c FROM Category c WHERE c.userId = :userId OR c.userId IS NULL ORDER BY c.name")
    List<Category> findVisibleTo(@Param("userId") Long userId);

    Optional<Category> findByIdAndUserId(Long id, Long userId);
}
