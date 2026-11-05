package com.sharonsoftware.talentbridge;

import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

abstract class DatabaseIntegrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void cleanSharedDatabase() {
        jdbcTemplate.execute("DELETE FROM messages");
        jdbcTemplate.execute("DELETE FROM message_threads");
        jdbcTemplate.execute("DELETE FROM external_access_grants");
        jdbcTemplate.execute("DELETE FROM submission_reviews");
        jdbcTemplate.execute("DELETE FROM score_cards");
        jdbcTemplate.execute("DELETE FROM submissions");
        jdbcTemplate.execute("DELETE FROM qualifications");
        jdbcTemplate.execute("DELETE FROM cv_entry_skills");
        jdbcTemplate.execute("DELETE FROM cv_entries");
        jdbcTemplate.execute("DELETE FROM recommendation_letters");
        jdbcTemplate.execute("DELETE FROM hire_requests");
        jdbcTemplate.execute("DELETE FROM assignments");
        jdbcTemplate.execute("DELETE FROM student_profiles");
        jdbcTemplate.execute("DELETE FROM cohort_external_tutors");
        jdbcTemplate.execute("DELETE FROM cohorts");
        jdbcTemplate.execute("DELETE FROM users");
    }
}