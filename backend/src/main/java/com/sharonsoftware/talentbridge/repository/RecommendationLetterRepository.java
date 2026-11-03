package com.sharonsoftware.talentbridge.repository;

import com.sharonsoftware.talentbridge.domain.RecommendationLetter;
import com.sharonsoftware.talentbridge.domain.RecommendationLetterStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RecommendationLetterRepository extends JpaRepository<RecommendationLetter, UUID> {
	List<RecommendationLetter> findAllByStudentProfileIdAndStatusOrderByPublishedAtDesc(
			UUID studentProfileId,
			RecommendationLetterStatus status);

	Optional<RecommendationLetter> findByIdAndAuthorId(UUID id, UUID authorId);

	boolean existsByIdAndStudentProfileUserIdAndStatus(
			UUID id,
			UUID userId,
			RecommendationLetterStatus status);
}