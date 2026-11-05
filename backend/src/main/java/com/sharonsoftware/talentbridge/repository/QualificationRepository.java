package com.sharonsoftware.talentbridge.repository;

import com.sharonsoftware.talentbridge.domain.Qualification;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface QualificationRepository extends JpaRepository<Qualification, UUID> {
	List<Qualification> findAllByStudentProfileId(UUID studentProfileId);

	@Query("select distinct qualification.name from Qualification qualification "
	    + "where qualification.studentProfile.startDate <= :eligibleStartDate "
	    + "order by lower(qualification.name)")
	List<String> findEligibleNames(@Param("eligibleStartDate") LocalDate eligibleStartDate);
}