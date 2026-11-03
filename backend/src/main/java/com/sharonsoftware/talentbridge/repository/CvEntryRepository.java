package com.sharonsoftware.talentbridge.repository;

import com.sharonsoftware.talentbridge.domain.CvEntry;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CvEntryRepository extends JpaRepository<CvEntry, UUID> {
}