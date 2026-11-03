package com.sharonsoftware.talentbridge.repository;

import com.sharonsoftware.talentbridge.domain.Qualification;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QualificationRepository extends JpaRepository<Qualification, UUID> {
	List<Qualification> findAllByStudentProfileId(UUID studentProfileId);
}