ALTER TABLE score_cards ALTER COLUMN score DROP NOT NULL;

ALTER TABLE score_cards
    ADD COLUMN analysis_status VARCHAR(16) NOT NULL DEFAULT 'COMPLETED'
        CHECK (analysis_status IN ('PENDING', 'COMPLETED', 'FAILED')),
    ADD COLUMN quality_score INTEGER,
    ADD COLUMN correctness_score INTEGER,
    ADD COLUMN originality_score INTEGER,
    ADD COLUMN communication_score INTEGER,
    ADD COLUMN strengths TEXT,
    ADD COLUMN weaknesses TEXT,
    ADD COLUMN suggestions TEXT,
    ADD COLUMN error_message TEXT;

ALTER TABLE score_cards ALTER COLUMN analysis_status SET DEFAULT 'PENDING';

ALTER TABLE student_profiles ADD COLUMN overall_score NUMERIC(5, 2);