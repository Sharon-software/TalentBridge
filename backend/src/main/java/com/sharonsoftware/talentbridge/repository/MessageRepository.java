package com.sharonsoftware.talentbridge.repository;

import com.sharonsoftware.talentbridge.domain.Message;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface MessageRepository extends JpaRepository<Message, UUID> {
    List<Message> findAllByThreadIdOrderBySentAtAsc(UUID threadId);

    long countByThreadIdAndRecipientIdAndReadAtIsNull(UUID threadId, UUID recipientId);

	@Transactional
    @Modifying
    @Query("update Message message set message.readAt = :readAt "
	    + "where message.thread.id = :threadId and message.recipient.id = :recipientId and message.readAt is null")
    int markThreadReadForRecipient(
	    @Param("threadId") UUID threadId,
	    @Param("recipientId") UUID recipientId,
	    @Param("readAt") Instant readAt);

    @Query("select count(message) from Message message "
	    + "where message.recipient.id = :userId and message.readAt is null "
	    + "and exists (select accessGrant.id from ExternalAccessGrant accessGrant "
	    + "where accessGrant.submission.id = message.thread.submission.id "
	    + "and accessGrant.externalMentor.id = message.thread.externalMentor.id "
	    + "and accessGrant.revoked = false "
	    + "and (accessGrant.expiresAt is null or accessGrant.expiresAt > :now))")
    long countUnreadForUserWithActiveGrant(@Param("userId") UUID userId, @Param("now") Instant now);
}