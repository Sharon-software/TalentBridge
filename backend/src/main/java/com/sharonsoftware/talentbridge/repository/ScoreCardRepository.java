package com.sharonsoftware.talentbridge.repository;

import com.sharonsoftware.talentbridge.domain.ScoreCard;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ScoreCardRepository extends JpaRepository<ScoreCard, UUID> {
}