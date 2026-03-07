START TRANSACTION;

CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO users (name, email, password_hash)
SELECT
    'Legacy User',
    'legacy@example.com',
    '$2y$12$xDxuekMMkQ/NSggxNTl6WehE5I38t.tKlhMrTybaCnDd5QHoOm5jy'
WHERE NOT EXISTS (
    SELECT 1
    FROM users
    WHERE email = 'legacy@example.com'
);

ALTER TABLE tasks
    ADD COLUMN user_id INT UNSIGNED NULL AFTER id;

SET @legacy_user_id := (
    SELECT id
    FROM users
    WHERE email = 'legacy@example.com'
    LIMIT 1
);

UPDATE tasks
SET user_id = @legacy_user_id
WHERE user_id IS NULL;

ALTER TABLE tasks
    MODIFY COLUMN user_id INT UNSIGNED NOT NULL,
    ADD INDEX idx_tasks_user_id (user_id),
    ADD CONSTRAINT fk_tasks_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE;

COMMIT;
