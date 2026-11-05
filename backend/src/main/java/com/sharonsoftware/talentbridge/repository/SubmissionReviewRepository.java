package com.sharonsoftware.talentbridge.repository;

import com.sharonsoftware.talentbridge.domain.SubmissionReview;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SubmissionReviewRepository extends JpaRepository<SubmissionReview, UUID> {

    Optional<SubmissionReview> findBySubmissionIdAndAuthorId(UUID submissionId, UUID authorId);

    @EntityGraph(attributePaths = "author")
    List<SubmissionReview> findAllBySubmissionIdOrderByUpdatedAtDesc(UUID submissionId);
}