package com.sharonsoftware.talentbridge.repository;

import com.sharonsoftware.talentbridge.domain.RecommendationLetter;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RecommendationLetterRepository extends JpaRepository<RecommendationLetter, UUID> {
}