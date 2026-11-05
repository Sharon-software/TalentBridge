package com.sharonsoftware.talentbridge.repository;

import com.sharonsoftware.talentbridge.domain.Submission;
import com.sharonsoftware.talentbridge.domain.SubmissionStatus;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SubmissionRepository extends JpaRepository<Submission, UUID> {
	boolean existsByAssignmentIdAndStudentProfileId(UUID assignmentId, UUID studentProfileId);

	@EntityGraph(attributePaths = "assignment")
	List<Submission> findAllByStudentProfileIdOrderBySubmittedAtDesc(UUID studentProfileId);

	@EntityGraph(attributePaths = {"assignment", "studentProfile"})
	List<Submission> findAllByAssignment_Cohort_Id(UUID cohortId);

	long countByStudentProfileId(UUID studentProfileId);

	long countByStudentProfileIdAndStatus(UUID studentProfileId, SubmissionStatus status);
}