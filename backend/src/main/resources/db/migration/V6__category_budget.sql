CREATE TABLE category_budget (
    id             BIGSERIAL PRIMARY KEY,
    user_id        BIGINT        NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    category_id    BIGINT        NOT NULL REFERENCES category  (id) ON DELETE CASCADE,
    monthly_budget NUMERIC(14,2) NOT NULL CHECK (monthly_budget > 0),
    CONSTRAINT uq_user_category_budget UNIQUE (user_id, category_id)
);
