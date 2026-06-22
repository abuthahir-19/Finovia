package com.expensetracker.finance.service;

import com.expensetracker.finance.domain.GoalStatus;
import com.expensetracker.finance.domain.SavingsGoal;
import com.expensetracker.finance.domain.SavingsGoalRepository;
import com.expensetracker.finance.web.ResourceNotFoundException;
import com.expensetracker.finance.web.dto.SavingsGoalDto;
import com.expensetracker.finance.web.dto.SavingsGoalRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class SavingsGoalService {

    private final SavingsGoalRepository goals;

    public SavingsGoalService(SavingsGoalRepository goals) {
        this.goals = goals;
    }

    @Transactional(readOnly = true)
    public List<SavingsGoalDto> list(Long userId) {
        return goals.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(SavingsGoalDto::from).toList();
    }

    @Transactional
    public SavingsGoalDto create(Long userId, SavingsGoalRequest req) {
        SavingsGoal g = new SavingsGoal(userId, req.name(), req.targetAmount(),
                req.currentAmount(), req.targetDate());
        applyStatus(g);
        return SavingsGoalDto.from(goals.save(g));
    }

    @Transactional
    public SavingsGoalDto update(Long userId, Long id, SavingsGoalRequest req) {
        SavingsGoal g = goals.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Goal not found: " + id));
        g.setName(req.name());
        g.setTargetAmount(req.targetAmount());
        g.setCurrentAmount(req.currentAmount() == null ? BigDecimal.ZERO : req.currentAmount());
        g.setTargetDate(req.targetDate());
        applyStatus(g);
        g.touch();
        return SavingsGoalDto.from(goals.save(g));
    }

    @Transactional
    public void delete(Long userId, Long id) {
        SavingsGoal g = goals.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Goal not found: " + id));
        goals.delete(g);
    }

    /** Auto-mark a goal ACHIEVED once the current amount reaches the target. */
    private void applyStatus(SavingsGoal g) {
        if (g.getStatus() == GoalStatus.ARCHIVED) {
            return;
        }
        boolean reached = g.getCurrentAmount().compareTo(g.getTargetAmount()) >= 0;
        g.setStatus(reached ? GoalStatus.ACHIEVED : GoalStatus.ACTIVE);
    }
}
