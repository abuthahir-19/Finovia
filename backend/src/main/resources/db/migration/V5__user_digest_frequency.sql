-- Email digest opt-in: how often a user wants their summary email, and when we last sent one.
ALTER TABLE app_user
    ADD COLUMN digest_frequency   VARCHAR(10) NOT NULL DEFAULT 'NONE',
    ADD COLUMN last_digest_sent_at TIMESTAMPTZ;
