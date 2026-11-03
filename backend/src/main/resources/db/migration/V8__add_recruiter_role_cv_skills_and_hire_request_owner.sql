ALTER TABLE users DROP CONSTRAINT chk_users_role;

ALTER TABLE users
    ADD CONSTRAINT chk_users_role
    CHECK (role IN ('STUDENT', 'COACH', 'ADMIN', 'MENTOR', 'EMPLOYER', 'RECRUITER', 'EXTERNAL_MENTOR'));

CREATE TABLE cv_entry_skills (
    cv_entry_id UUID NOT NULL REFERENCES cv_entries (id) ON DELETE CASCADE,
    skill VARCHAR(100) NOT NULL,
    PRIMARY KEY (cv_entry_id, skill)
);

ALTER TABLE hire_requests ADD COLUMN requested_by UUID REFERENCES users (id);