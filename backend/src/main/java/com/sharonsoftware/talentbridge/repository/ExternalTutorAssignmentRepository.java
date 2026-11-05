package com.sharonsoftware.talentbridge.repository;

import com.sharonsoftware.talentbridge.domain.ExternalTutorAssignment;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExternalTutorAssignmentRepository extends JpaRepository<ExternalTutorAssignment, UUID> {

    @EntityGraph(attributePaths = "cohort")
    List<ExternalTutorAssignment> findAllByExternalTutorIdOrderByCohortNameAsc(UUID externalTutorId);

    @EntityGraph(attributePaths = "externalTutor")
    List<ExternalTutorAssignment> findAllByCohortIdOrderByExternalTutorLastNameAsc(UUID cohortId);

    Optional<ExternalTutorAssignment> findByCohortIdAndExternalTutorId(UUID cohortId, UUID externalTutorId);

    boolean existsByCohortIdAndExternalTutorId(UUID cohortId, UUID externalTutorId);

    void deleteByCohortIdAndExternalTutorId(UUID cohortId, UUID externalTutorId);
}