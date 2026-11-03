package com.sharonsoftware.talentbridge.repository;

import com.sharonsoftware.talentbridge.domain.HireRequest;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HireRequestRepository extends JpaRepository<HireRequest, UUID> {
	List<HireRequest> findAllByRequestedByIdOrderByRequestedAtDesc(UUID requestedById);
}