ALTER TABLE external_access_grants ALTER COLUMN expires_at DROP NOT NULL;

ALTER TABLE external_access_grants
    ADD COLUMN submission_id UUID REFERENCES submissions (id);

CREATE INDEX idx_external_grants_active_lookup
    ON external_access_grants (submission_id, external_mentor_id, revoked, expires_at);