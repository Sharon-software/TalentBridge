ALTER TABLE recommendation_letters
    ADD COLUMN author_id UUID REFERENCES users (id),
    ADD COLUMN status VARCHAR(16) NOT NULL DEFAULT 'PUBLISHED'
        CHECK (status IN ('DRAFT', 'PUBLISHED')),
    ADD COLUMN published_at TIMESTAMPTZ;

UPDATE recommendation_letters
SET published_at = created_at
WHERE status = 'PUBLISHED';

ALTER TABLE recommendation_letters ALTER COLUMN status SET DEFAULT 'DRAFT';

CREATE INDEX idx_recommendation_letters_student_status
    ON recommendation_letters (student_profile_id, status, published_at);