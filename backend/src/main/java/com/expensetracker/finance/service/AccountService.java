package com.expensetracker.finance.service;

import com.expensetracker.finance.domain.AppUser;
import com.expensetracker.finance.domain.AppUserRepository;
import com.expensetracker.finance.domain.GoalStatus;
import com.expensetracker.finance.domain.SavingsGoalRepository;
import com.expensetracker.finance.domain.TransactionRepository;
import com.expensetracker.finance.domain.TransactionType;
import com.expensetracker.finance.web.dto.AccountStatsDto;
import com.expensetracker.finance.web.dto.ProfileDto;
import com.expensetracker.finance.web.dto.UpdateProfileRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;

/** Profile read/update and lifetime account statistics for the user dashboard. */
@Service
public class AccountService {

    private final TransactionRepository transactions;
    private final SavingsGoalRepository goals;
    private final AppUserRepository users;

    public AccountService(TransactionRepository transactions, SavingsGoalRepository goals,
                          AppUserRepository users) {
        this.transactions = transactions;
        this.goals = goals;
        this.users = users;
    }

    @Transactional
    public ProfileDto updateProfile(AppUser user, UpdateProfileRequest req) {
        if (req.displayName() != null) {
            user.setDisplayName(req.displayName().isBlank() ? null : req.displayName().trim());
        }
        if (StringUtils.hasText(req.baseCurrency())) {
            user.setBaseCurrency(req.baseCurrency().toUpperCase());
        }
        user.touch();
        return ProfileDto.from(users.save(user)); // merge detached entity + persist
    }

    @Transactional(readOnly = true)
    public AccountStatsDto stats(Long userId) {
        BigDecimal income = transactions.sumByTypeAllTime(userId, TransactionType.INCOME);
        BigDecimal expense = transactions.sumByTypeAllTime(userId, TransactionType.EXPENSE);
        return new AccountStatsDto(
                transactions.countByUserId(userId),
                income,
                expense,
                income.subtract(expense),
                goals.countByUserId(userId),
                goals.countByUserIdAndStatus(userId, GoalStatus.ACTIVE),
                goals.countByUserIdAndStatus(userId, GoalStatus.ACHIEVED));
    }
}
