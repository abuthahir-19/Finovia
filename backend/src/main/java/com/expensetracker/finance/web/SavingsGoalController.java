package com.expensetracker.finance.web;

import com.expensetracker.finance.security.FirebaseUserPrincipal;
import com.expensetracker.finance.service.CurrentUserService;
import com.expensetracker.finance.service.SavingsGoalService;
import com.expensetracker.finance.web.dto.SavingsGoalDto;
import com.expensetracker.finance.web.dto.SavingsGoalRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/goals")
public class SavingsGoalController {

    private final SavingsGoalService service;
    private final CurrentUserService currentUser;

    public SavingsGoalController(SavingsGoalService service, CurrentUserService currentUser) {
        this.service = service;
        this.currentUser = currentUser;
    }

    @GetMapping
    public List<SavingsGoalDto> list(@AuthenticationPrincipal FirebaseUserPrincipal principal) {
        return service.list(currentUser.resolveId(principal));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SavingsGoalDto create(@AuthenticationPrincipal FirebaseUserPrincipal principal,
                                 @Valid @RequestBody SavingsGoalRequest body) {
        return service.create(currentUser.resolveId(principal), body);
    }

    @PutMapping("/{id}")
    public SavingsGoalDto update(@AuthenticationPrincipal FirebaseUserPrincipal principal,
                                 @PathVariable Long id,
                                 @Valid @RequestBody SavingsGoalRequest body) {
        return service.update(currentUser.resolveId(principal), id, body);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal FirebaseUserPrincipal principal,
                       @PathVariable Long id) {
        service.delete(currentUser.resolveId(principal), id);
    }
}
