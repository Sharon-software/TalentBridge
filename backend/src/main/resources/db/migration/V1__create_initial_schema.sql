CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(320) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'STUDENT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cohorts (
    id UUID PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    start_date DATE,
    end_date DATE
);

CREATE TABLE student_profiles (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES users (id),
    cohort_id UUID REFERENCES cohorts (id),
    start_date DATE NOT NULL
);

CREATE TABLE qualifications (
    id UUID PRIMARY KEY,
    student_profile_id UUID NOT NULL REFERENCES student_profiles (id),
    name VARCHAR(200) NOT NULL,
    institution VARCHAR(200),
    awarded_at DATE
);

CREATE TABLE assignments (
    id UUID PRIMARY KEY,
    cohort_id UUID NOT NULL REFERENCES cohorts (id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    due_at TIMESTAMPTZ
);

CREATE TABLE submissions (
    id UUID PRIMARY KEY,
    assignment_id UUID NOT NULL REFERENCES assignments (id),
    student_profile_id UUID NOT NULL REFERENCES student_profiles (id),
    submitted_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(16) NOT NULL CHECK (status IN ('ON_TIME', 'LATE')),
    CONSTRAINT uq_submissions_assignment_student UNIQUE (assignment_id, student_profile_id)
);

CREATE TABLE score_cards (
    id UUID PRIMARY KEY,
    submission_id UUID NOT NULL UNIQUE REFERENCES submissions (id),
    score NUMERIC(5, 2) NOT NULL,
    feedback TEXT
);

CREATE TABLE external_access_grants (
    id UUID PRIMARY KEY,
    assignment_id UUID NOT NULL REFERENCES assignments (id),
    external_mentor_id UUID NOT NULL REFERENCES users (id),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE messages (
    id UUID PRIMARY KEY,
    sender_id UUID NOT NULL REFERENCES users (id),
    recipient_id UUID NOT NULL REFERENCES users (id),
    body TEXT NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cv_entries (
    id UUID PRIMARY KEY,
    student_profile_id UUID NOT NULL REFERENCES student_profiles (id),
    title VARCHAR(200) NOT NULL,
    organization VARCHAR(200),
    description TEXT,
    start_date DATE,
    end_date DATE
);

CREATE TABLE recommendation_letters (
    id UUID PRIMARY KEY,
    student_profile_id UUID NOT NULL REFERENCES student_profiles (id),
    author_name VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE hire_requests (
    id UUID PRIMARY KEY,
    student_profile_id UUID NOT NULL REFERENCES student_profiles (id),
    company_name VARCHAR(200) NOT NULL,
    contact_email VARCHAR(320),
    message TEXT,
    status VARCHAR(16) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED')),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);