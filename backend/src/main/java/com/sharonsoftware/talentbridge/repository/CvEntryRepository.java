package com.sharonsoftware.talentbridge.repository;

import com.sharonsoftware.talentbridge.domain.CvEntry;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CvEntryRepository extends JpaRepository<CvEntry, UUID> {

    @EntityGraph(attributePaths = "skills")
    List<CvEntry> findAllByStudentProfileUserIdOrderByStartDateDesc(UUID userId);

    @EntityGraph(attributePaths = "skills")
    Optional<CvEntry> findByIdAndStudentProfileUserId(UUID id, UUID userId);

    @EntityGraph(attributePaths = "skills")
    List<CvEntry> findAllByStudentProfileIdOrderByStartDateDesc(UUID studentProfileId);

    @Query("select distinct skill from CvEntry entry join entry.skills skill "
            + "where entry.studentProfile.id = :studentProfileId")
    Set<String> findSkillsByStudentProfileId(@Param("studentProfileId") UUID studentProfileId);

    @Query("select min(entry.startDate) from CvEntry entry where entry.studentProfile.id = :studentProfileId")
    LocalDate findEarliestStartDateByStudentProfileId(@Param("studentProfileId") UUID studentProfileId);
}