package com.expensetracker.finance.web;

import com.expensetracker.finance.security.FirebaseUserPrincipal;
import com.expensetracker.finance.service.CurrentUserService;
import com.expensetracker.finance.service.TransactionService;
import com.expensetracker.finance.service.imports.StatementImportService;
import com.expensetracker.finance.web.dto.StatementImportResultDto;
import com.expensetracker.finance.web.dto.TransactionDto;
import com.expensetracker.finance.web.dto.TransactionRequest;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    private final TransactionService service;
    private final CurrentUserService currentUser;
    private final StatementImportService importService;

    public TransactionController(TransactionService service, CurrentUserService currentUser,
                                 StatementImportService importService) {
        this.service = service;
        this.currentUser = currentUser;
        this.importService = importService;
    }

    @GetMapping
    public List<TransactionDto> list(
            @AuthenticationPrincipal FirebaseUserPrincipal principal,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return service.list(currentUser.resolveId(principal), from, to);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TransactionDto create(@AuthenticationPrincipal FirebaseUserPrincipal principal,
                                 @Valid @RequestBody TransactionRequest body) {
        return service.create(currentUser.resolveId(principal), body);
    }

    @PutMapping("/{id}")
    public TransactionDto update(@AuthenticationPrincipal FirebaseUserPrincipal principal,
                                 @PathVariable Long id,
                                 @Valid @RequestBody TransactionRequest body) {
        return service.update(currentUser.resolveId(principal), id, body);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal FirebaseUserPrincipal principal,
                       @PathVariable Long id) {
        service.delete(currentUser.resolveId(principal), id);
    }

    /**
     * Imports transactions from an uploaded statement PDF (GPay/UPI/bank exports).
     * Detected rows are auto-saved; the response summarizes what was imported and skipped.
     */
    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public StatementImportResultDto importStatement(
            @AuthenticationPrincipal FirebaseUserPrincipal principal,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "password", required = false) String password) throws IOException {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Please choose a non-empty PDF file.");
        }
        String contentType = file.getContentType();
        boolean looksPdf = (contentType != null && contentType.contains("pdf"))
                || (file.getOriginalFilename() != null
                    && file.getOriginalFilename().toLowerCase().endsWith(".pdf"));
        if (!looksPdf) {
            throw new IllegalArgumentException("Only PDF statements are supported.");
        }
        return importService.importStatement(currentUser.resolveId(principal), file.getBytes(), password);
    }
}
