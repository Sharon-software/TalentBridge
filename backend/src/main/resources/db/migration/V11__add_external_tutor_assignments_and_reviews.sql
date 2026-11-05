CREATE TABLE cohort_external_tutors (
    id UUID PRIMARY KEY,
    cohort_id UUID NOT NULL REFERENCES cohorts (id) ON DELETE CASCADE,
    external_tutor_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_cohort_external_tutor UNIQUE (cohort_id, external_tutor_id)
);

CREATE TABLE submission_reviews (
    id UUID PRIMARY KEY,
    submission_id UUID NOT NULL REFERENCES submissions (id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users (id),
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comments TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_submission_review_author UNIQUE (submission_id, author_id)
);