package com.sharonsoftware.talentbridge.repository;

import com.sharonsoftware.talentbridge.domain.Submission;
import com.sharonsoftware.talentbridge.domain.SubmissionStatus;
import java.util.List;
import java.util.UUID;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SubmissionRepository extends JpaRepository<Submission, UUID> {
	boolean existsByAssignmentIdAndStudentProfileId(UUID assignmentId, UUID studentProfileId);

	@EntityGraph(attributePaths = "assignment")
	List<Submission> findAllByStudentProfileIdOrderBySubmittedAtDesc(UUID studentProfileId);

	@EntityGraph(attributePaths = {"assignment", "studentProfile", "studentProfile.user"})
	List<Submission> findAllByAssignment_Cohort_Id(UUID cohortId);

	@Query("select submission.assignment.cohort.id from Submission submission where submission.id = :submissionId")
	Optional<UUID> findCohortIdById(@Param("submissionId") UUID submissionId);

	long countByStudentProfileId(UUID studentProfileId);

	long countByStudentProfileIdAndStatus(UUID studentProfileId, SubmissionStatus status);
}