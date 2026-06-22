CREATE TABLE app_user (
    id            BIGSERIAL PRIMARY KEY,
    firebase_uid  VARCHAR(128) NOT NULL UNIQUE,
    email         VARCHAR(255) NOT NULL,
    display_name  VARCHAR(120),
    base_currency CHAR(3) NOT NULL DEFAULT 'USD',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE category (
    id      BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES app_user(id) ON DELETE CASCADE, -- NULL = system default
    name    VARCHAR(80) NOT NULL,
    kind    VARCHAR(10) NOT NULL CHECK (kind IN ('EXPENSE', 'INCOME')),
    color   VARCHAR(7),
    icon    VARCHAR(40),
    UNIQUE (user_id, name, kind)
);

CREATE TABLE transaction (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    category_id BIGINT REFERENCES category(id) ON DELETE SET NULL,
    type        VARCHAR(10) NOT NULL CHECK (type IN ('EXPENSE', 'INCOME')),
    amount      NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    currency    CHAR(3) NOT NULL DEFAULT 'USD',
    description VARCHAR(255),
    occurred_on DATE NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_txn_user_date ON transaction (user_id, occurred_on);
CREATE INDEX idx_txn_user_cat ON transaction (user_id, category_id);

CREATE TABLE savings_goal (
    id             BIGSERIAL PRIMARY KEY,
    user_id        BIGINT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    name           VARCHAR(120) NOT NULL,
    target_amount  NUMERIC(14, 2) NOT NULL CHECK (target_amount > 0),
    current_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
    target_date    DATE,
    status         VARCHAR(12) NOT NULL DEFAULT 'ACTIVE'
                   CHECK (status IN ('ACTIVE', 'ACHIEVED', 'ARCHIVED')),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_goal_user ON savings_goal (user_id);

CREATE TABLE goal_contribution (
    id          BIGSERIAL PRIMARY KEY,
    goal_id     BIGINT NOT NULL REFERENCES savings_goal(id) ON DELETE CASCADE,
    amount      NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    occurred_on DATE NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_contrib_goal ON goal_contribution (goal_id);
