package com.sharonsoftware.talentbridge.repository;

import com.sharonsoftware.talentbridge.domain.ExternalAccessGrant;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ExternalAccessGrantRepository extends JpaRepository<ExternalAccessGrant, UUID> {
    Optional<ExternalAccessGrant> findByIdAndSubmissionId(UUID id, UUID submissionId);

    @Query("select accessGrant from ExternalAccessGrant accessGrant "
	    + "where accessGrant.submission.id = :submissionId "
	    + "and accessGrant.revoked = false "
	    + "and (accessGrant.expiresAt is null or accessGrant.expiresAt > :now)")
    List<ExternalAccessGrant> findActiveBySubmissionId(
	    @Param("submissionId") UUID submissionId,
	    @Param("now") Instant now);

    @Query("select distinct accessGrant from ExternalAccessGrant accessGrant "
	    + "join fetch accessGrant.submission submission "
	    + "join fetch submission.assignment "
	    + "join fetch submission.studentProfile profile "
	    + "join fetch profile.user "
	    + "where accessGrant.externalMentor.id = :mentorId "
	    + "and accessGrant.revoked = false "
	    + "and (accessGrant.expiresAt is null or accessGrant.expiresAt > :now)")
    List<ExternalAccessGrant> findActiveByExternalMentorId(
	    @Param("mentorId") UUID mentorId,
	    @Param("now") Instant now);

    @Query("select case when count(accessGrant) > 0 then true else false end "
	    + "from ExternalAccessGrant accessGrant "
	    + "where accessGrant.submission.id = :submissionId "
	    + "and accessGrant.externalMentor.id = :mentorId "
	    + "and accessGrant.revoked = false "
	    + "and (accessGrant.expiresAt is null or accessGrant.expiresAt > :now)")
    boolean hasActiveGrant(
	    @Param("submissionId") UUID submissionId,
	    @Param("mentorId") UUID mentorId,
	    @Param("now") Instant now);
}