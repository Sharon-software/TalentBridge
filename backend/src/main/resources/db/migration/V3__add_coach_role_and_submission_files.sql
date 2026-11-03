ALTER TABLE users DROP CONSTRAINT chk_users_role;

ALTER TABLE users
    ADD CONSTRAINT chk_users_role
    CHECK (role IN ('STUDENT', 'COACH', 'ADMIN', 'MENTOR', 'EMPLOYER', 'EXTERNAL_MENTOR'));

ALTER TABLE submissions
    ADD COLUMN storage_key VARCHAR(36),
    ADD COLUMN original_filename VARCHAR(255),
    ADD COLUMN content_type VARCHAR(255),
    ADD COLUMN file_size BIGINT;