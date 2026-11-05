package com.sharonsoftware.talentbridge.repository;

import com.sharonsoftware.talentbridge.domain.Assignment;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssignmentRepository extends JpaRepository<Assignment, UUID> {
	List<Assignment> findAllByCohortIdOrderByDueAtAsc(UUID cohortId);

	long countByCohortId(UUID cohortId);
}