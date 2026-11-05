ALTER TABLE cv_entries DROP CONSTRAINT chk_cv_entries_category;

ALTER TABLE cv_entries
    ADD CONSTRAINT chk_cv_entries_category
    CHECK (category IN ('EDUCATION', 'EXPERIENCE', 'SKILLS', 'CERTIFICATION', 'PROJECT'));