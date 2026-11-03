package com.sharonsoftware.talentbridge.messaging;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record CreateMessageThreadRequest(@NotNull UUID submissionId, UUID externalMentorId) {
}