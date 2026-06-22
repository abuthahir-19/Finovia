-- JPA maps String fields to VARCHAR, but V1 declared the 3-letter currency codes as
-- CHAR(3) (bpchar). With hibernate.ddl-auto=validate this fails schema validation.
-- Align the column types with the entity mappings.
ALTER TABLE app_user ALTER COLUMN base_currency TYPE VARCHAR(3);
ALTER TABLE transaction ALTER COLUMN currency TYPE VARCHAR(3);
