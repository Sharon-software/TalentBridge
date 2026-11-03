package com.sharonsoftware.talentbridge.repository;

import com.sharonsoftware.talentbridge.domain.Message;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MessageRepository extends JpaRepository<Message, UUID> {
}