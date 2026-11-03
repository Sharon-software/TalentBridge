package com.sharonsoftware.talentbridge.repository;

import com.sharonsoftware.talentbridge.domain.Assignment;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssignmentRepository extends JpaRepository<Assignment, UUID> {
}