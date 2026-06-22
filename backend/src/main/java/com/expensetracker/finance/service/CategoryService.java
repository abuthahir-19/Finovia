package com.expensetracker.finance.service;

import com.expensetracker.finance.domain.Category;
import com.expensetracker.finance.domain.CategoryRepository;
import com.expensetracker.finance.web.ResourceNotFoundException;
import com.expensetracker.finance.web.dto.CategoryDto;
import com.expensetracker.finance.web.dto.CategoryRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CategoryService {

    private final CategoryRepository categories;

    public CategoryService(CategoryRepository categories) {
        this.categories = categories;
    }

    @Transactional(readOnly = true)
    public List<CategoryDto> list(Long userId) {
        return categories.findVisibleTo(userId).stream().map(CategoryDto::from).toList();
    }

    @Transactional
    public CategoryDto create(Long userId, CategoryRequest req) {
        Category c = new Category(userId, req.name(), req.kind(), req.color(), req.icon());
        return CategoryDto.from(categories.save(c));
    }

    @Transactional
    public CategoryDto update(Long userId, Long id, CategoryRequest req) {
        // Only user-owned categories may be modified; system defaults are read-only.
        Category c = categories.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + id));
        c.setName(req.name());
        c.setKind(req.kind());
        c.setColor(req.color());
        c.setIcon(req.icon());
        return CategoryDto.from(categories.save(c));
    }

    @Transactional
    public void delete(Long userId, Long id) {
        Category c = categories.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + id));
        categories.delete(c);
    }
}
