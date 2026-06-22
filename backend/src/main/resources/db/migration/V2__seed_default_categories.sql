-- System-default categories (user_id IS NULL) available to every user.
INSERT INTO category (user_id, name, kind, color, icon) VALUES
    (NULL, 'Groceries',      'EXPENSE', '#22c55e', 'shopping-cart'),
    (NULL, 'Dining',         'EXPENSE', '#f97316', 'utensils'),
    (NULL, 'Rent',           'EXPENSE', '#ef4444', 'home'),
    (NULL, 'Utilities',      'EXPENSE', '#3b82f6', 'bolt'),
    (NULL, 'Transport',      'EXPENSE', '#8b5cf6', 'car'),
    (NULL, 'Entertainment',  'EXPENSE', '#ec4899', 'film'),
    (NULL, 'Health',         'EXPENSE', '#14b8a6', 'heart-pulse'),
    (NULL, 'Shopping',       'EXPENSE', '#eab308', 'shopping-bag'),
    (NULL, 'Other Expense',  'EXPENSE', '#94a3b8', 'ellipsis'),
    (NULL, 'Salary',         'INCOME',  '#16a34a', 'briefcase'),
    (NULL, 'Freelance',      'INCOME',  '#0ea5e9', 'laptop'),
    (NULL, 'Investments',    'INCOME',  '#a855f7', 'trending-up'),
    (NULL, 'Other Income',   'INCOME',  '#64748b', 'plus');
