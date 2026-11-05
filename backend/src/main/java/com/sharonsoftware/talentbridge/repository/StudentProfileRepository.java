package com.sharonsoftware.talentbridge.repository;

import com.sharonsoftware.talentbridge.domain.StudentProfile;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StudentProfileRepository extends JpaRepository<StudentProfile, UUID>, JpaSpecificationExecutor<StudentProfile> {
    @Override
    @EntityGraph(attributePaths = {"user", "cohort"})
    Optional<StudentProfile> findById(UUID id);

    @Override
    @EntityGraph(attributePaths = "user")
    Page<StudentProfile> findAll(Specification<StudentProfile> specification, Pageable pageable);

    Optional<StudentProfile> findByUserId(UUID userId);

    @EntityGraph(attributePaths = "user")
    List<StudentProfile> findAllByCohortId(UUID cohortId);

    long countByCohortId(UUID cohortId);

    @Query("select profile.user.id from StudentProfile profile where profile.id = :profileId")
    Optional<UUID> findUserIdById(@Param("profileId") UUID profileId);
}