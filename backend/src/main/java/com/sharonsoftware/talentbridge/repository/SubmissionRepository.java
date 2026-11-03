package com.sharonsoftware.talentbridge.repository;

import com.sharonsoftware.talentbridge.domain.Submission;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SubmissionRepository extends JpaRepository<Submission, UUID> {
}