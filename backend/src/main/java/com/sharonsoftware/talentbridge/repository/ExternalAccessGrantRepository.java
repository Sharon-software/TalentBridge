package com.sharonsoftware.talentbridge.repository;

import com.sharonsoftware.talentbridge.domain.ExternalAccessGrant;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExternalAccessGrantRepository extends JpaRepository<ExternalAccessGrant, UUID> {
}