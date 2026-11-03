CREATE TABLE message_threads (
    id UUID PRIMARY KEY,
    submission_id UUID NOT NULL REFERENCES submissions (id),
    student_id UUID NOT NULL REFERENCES users (id),
    external_mentor_id UUID NOT NULL REFERENCES users (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_message_threads_submission_mentor UNIQUE (submission_id, external_mentor_id)
);

ALTER TABLE messages
    ADD COLUMN thread_id UUID REFERENCES message_threads (id),
    ADD COLUMN read_at TIMESTAMPTZ;

CREATE INDEX idx_messages_thread_sent_at ON messages (thread_id, sent_at);
CREATE INDEX idx_messages_recipient_read_at ON messages (recipient_id, read_at);