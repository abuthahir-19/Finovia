-- The app's default currency is now INR. Convert existing rows (amounts were entered as
-- rupee values but mislabeled) and align the column defaults.
UPDATE transaction SET currency = 'INR' WHERE currency IS DISTINCT FROM 'INR';
UPDATE app_user SET base_currency = 'INR' WHERE base_currency IS DISTINCT FROM 'INR';

ALTER TABLE transaction ALTER COLUMN currency SET DEFAULT 'INR';
ALTER TABLE app_user ALTER COLUMN base_currency SET DEFAULT 'INR';
