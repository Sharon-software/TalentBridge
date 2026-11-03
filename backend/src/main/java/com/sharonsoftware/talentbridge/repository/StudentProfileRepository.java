package com.sharonsoftware.talentbridge.repository;

import com.sharonsoftware.talentbridge.domain.StudentProfile;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StudentProfileRepository extends JpaRepository<StudentProfile, UUID> {
    Optional<StudentProfile> findByUserId(UUID userId);

    @Query("select profile.user.id from StudentProfile profile where profile.id = :profileId")
    Optional<UUID> findUserIdById(@Param("profileId") UUID profileId);
}