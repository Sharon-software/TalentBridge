package com.sharonsoftware.talentbridge.repository;

import com.sharonsoftware.talentbridge.domain.Cohort;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CohortRepository extends JpaRepository<Cohort, UUID> {
	boolean existsByName(String name);

	boolean existsByNameAndIdNot(String name, UUID id);
}