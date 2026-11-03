package com.sharonsoftware.talentbridge.repository;

import com.sharonsoftware.talentbridge.domain.MessageThread;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MessageThreadRepository extends JpaRepository<MessageThread, UUID> {
    Optional<MessageThread> findBySubmissionIdAndExternalMentorId(UUID submissionId, UUID externalMentorId);

    @Query("select thread from MessageThread thread "
            + "where thread.student.id = :userId or thread.externalMentor.id = :userId "
            + "order by thread.createdAt desc")
    List<MessageThread> findAllForParticipant(@Param("userId") UUID userId);
}