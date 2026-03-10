START TRANSACTION;

ALTER TABLE tasks
    ADD COLUMN recurrence_type VARCHAR(20) NOT NULL DEFAULT 'daily' AFTER description,
    ADD COLUMN recurrence_days VARCHAR(32) NULL AFTER recurrence_type;

COMMIT;
