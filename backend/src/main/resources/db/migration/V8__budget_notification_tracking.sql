ALTER TABLE category_budget
    ADD COLUMN last_notified_pct   INTEGER    NOT NULL DEFAULT 0,
    ADD COLUMN last_notified_month VARCHAR(7);
