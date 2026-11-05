package com.sharonsoftware.talentbridge.repository;

import com.sharonsoftware.talentbridge.domain.ScoreCard;
import com.sharonsoftware.talentbridge.domain.AnalysisStatus;
import java.math.BigDecimal;
import java.util.Optional;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ScoreCardRepository extends JpaRepository<ScoreCard, UUID> {
    Optional<ScoreCard> findBySubmissionId(UUID submissionId);

	long countByAnalysisStatus(AnalysisStatus analysisStatus);

	@EntityGraph(attributePaths = "submission")
	List<ScoreCard> findAllBySubmissionStudentProfileIdOrderByIdAsc(UUID studentProfileId);

    @Query("select avg(card.score) from ScoreCard card join card.submission submission "
	    + "where submission.studentProfile.id = :studentProfileId and card.analysisStatus = :status")
    BigDecimal averageCompletedScoreByStudentProfileId(
	    @Param("studentProfileId") UUID studentProfileId,
	    @Param("status") AnalysisStatus status);
}