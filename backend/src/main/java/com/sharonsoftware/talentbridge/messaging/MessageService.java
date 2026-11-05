package com.sharonsoftware.talentbridge.messaging;

import com.sharonsoftware.talentbridge.domain.Message;
import com.sharonsoftware.talentbridge.domain.MessageThread;
import com.sharonsoftware.talentbridge.domain.Role;
import com.sharonsoftware.talentbridge.domain.Submission;
import com.sharonsoftware.talentbridge.domain.User;
import com.sharonsoftware.talentbridge.repository.ExternalAccessGrantRepository;
import com.sharonsoftware.talentbridge.repository.MessageRepository;
import com.sharonsoftware.talentbridge.repository.MessageThreadRepository;
import com.sharonsoftware.talentbridge.repository.StudentProfileRepository;
import com.sharonsoftware.talentbridge.repository.SubmissionRepository;
import com.sharonsoftware.talentbridge.repository.UserRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class MessageService {

    private final MessageThreadRepository threadRepository;
    private final MessageRepository messageRepository;
    private final SubmissionRepository submissionRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final UserRepository userRepository;
    private final ExternalAccessGrantRepository grantRepository;
    private final ObjectProvider<SimpMessagingTemplate> messagingTemplateProvider;

    public MessageService(
            MessageThreadRepository threadRepository,
            MessageRepository messageRepository,
            SubmissionRepository submissionRepository,
            StudentProfileRepository studentProfileRepository,
            UserRepository userRepository,
            ExternalAccessGrantRepository grantRepository,
            ObjectProvider<SimpMessagingTemplate> messagingTemplateProvider) {
        this.threadRepository = threadRepository;
        this.messageRepository = messageRepository;
        this.submissionRepository = submissionRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.userRepository = userRepository;
        this.grantRepository = grantRepository;
        this.messagingTemplateProvider = messagingTemplateProvider;
    }

    public ThreadSummary createThread(CreateMessageThreadRequest request, UUID currentUserId) {
        User currentUser = findUser(currentUserId);
        Submission submission = submissionRepository.findById(request.submissionId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Submission not found"));
        UUID studentId = studentProfileRepository.findUserIdById(submission.getStudentProfile().getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student profile not found"));

        UUID externalMentorId;
        if (currentUser.getRole() == Role.STUDENT) {
            if (!studentId.equals(currentUserId)) {
                throw forbidden();
            }
            if (request.externalMentorId() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "externalMentorId is required for students");
            }
            externalMentorId = request.externalMentorId();
        } else if (currentUser.getRole() == Role.EXTERNAL_MENTOR) {
            if (request.externalMentorId() != null && !request.externalMentorId().equals(currentUserId)) {
                throw forbidden();
            }
            externalMentorId = currentUserId;
        } else {
            throw forbidden();
        }

        User externalMentor = findUser(externalMentorId);
        if (externalMentor.getRole() != Role.EXTERNAL_MENTOR) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "User is not an external mentor");
        }
        requireActiveGrant(request.submissionId(), externalMentorId);

        MessageThread thread = threadRepository.findBySubmissionIdAndExternalMentorId(
                        request.submissionId(), externalMentorId)
                .orElseGet(() -> {
                    User student = findUser(studentId);
                    MessageThread newThread = new MessageThread();
                    newThread.setSubmission(submission);
                    newThread.setStudent(student);
                    newThread.setExternalMentor(externalMentor);
                    return threadRepository.save(newThread);
                });
        return toThreadSummary(thread, currentUserId);
    }

    public List<ThreadSummary> listThreads(UUID currentUserId) {
        return threadRepository.findAllForParticipant(currentUserId).stream()
                .filter(thread -> hasActiveGrant(thread))
                .map(thread -> toThreadSummary(thread, currentUserId))
                .toList();
    }

    public ThreadMessages readThread(UUID threadId, UUID currentUserId) {
        MessageThread thread = requireReadableThread(threadId, currentUserId);
        messageRepository.markThreadReadForRecipient(threadId, currentUserId, Instant.now());
        List<MessageView> messages = messageRepository.findAllByThreadIdOrderBySentAtAsc(threadId).stream()
                .map(MessageService::toMessageView)
                .toList();
        return new ThreadMessages(toThreadSummary(thread, currentUserId), messages);
    }

    public MessageView sendMessage(UUID threadId, UUID senderId, String body) {
        String normalizedBody = body == null ? "" : body.trim();
        if (normalizedBody.isEmpty() || normalizedBody.length() > 4000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Message must contain 1 to 4000 characters");
        }
        MessageThread thread = requireReadableThread(threadId, senderId);
        UUID recipientId;
        if (thread.getStudent().getId().equals(senderId)) {
            recipientId = thread.getExternalMentor().getId();
        } else {
            recipientId = thread.getStudent().getId();
        }
        Message message = new Message();
        message.setThread(thread);
        message.setSender(findUser(senderId));
        message.setRecipient(findUser(recipientId));
        message.setBody(normalizedBody);
        MessageView result = toMessageView(messageRepository.save(message));
        String destination = "/queue/threads/" + threadId;
        SimpMessagingTemplate messagingTemplate = messagingTemplateProvider.getObject();
        messagingTemplate.convertAndSendToUser(senderId.toString(), destination, result);
        messagingTemplate.convertAndSendToUser(recipientId.toString(), destination, result);
        return result;
    }

    public UnreadCount unreadCount(UUID userId) {
        return new UnreadCount(messageRepository.countUnreadForUserWithActiveGrant(userId, Instant.now()));
    }

    public void assertCanAccessThread(UUID threadId, UUID userId) {
        requireReadableThread(threadId, userId);
    }

    private MessageThread requireReadableThread(UUID threadId, UUID userId) {
        MessageThread thread = threadRepository.findById(threadId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Message thread not found"));
        if (!thread.getStudent().getId().equals(userId)
                && !thread.getExternalMentor().getId().equals(userId)) {
            throw forbidden();
        }
        requireActiveGrant(thread.getSubmission().getId(), thread.getExternalMentor().getId());
        return thread;
    }

    private boolean hasActiveGrant(MessageThread thread) {
        return grantRepository.hasActiveGrant(
                thread.getSubmission().getId(), thread.getExternalMentor().getId(), Instant.now());
    }

    private void requireActiveGrant(UUID submissionId, UUID externalMentorId) {
        if (!grantRepository.hasActiveGrant(submissionId, externalMentorId, Instant.now())) {
            throw forbidden();
        }
    }

    private ThreadSummary toThreadSummary(MessageThread thread, UUID userId) {
        long unread = messageRepository.countByThreadIdAndRecipientIdAndReadAtIsNull(thread.getId(), userId);
        User externalMentor = findUser(thread.getExternalMentor().getId());
        User student = findUser(thread.getStudent().getId());
        String participantName = userId.equals(student.getId())
            ? externalMentor.getFirstName() + " " + externalMentor.getLastName()
            : student.getFirstName() + " " + student.getLastName();
        return new ThreadSummary(
                thread.getId(), thread.getSubmission().getId(), thread.getStudent().getId(),
            thread.getExternalMentor().getId(),
            externalMentor.getFirstName() + " " + externalMentor.getLastName(),
            participantName, thread.getCreatedAt(), unread);
    }

    private User findUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private static MessageView toMessageView(Message message) {
        return new MessageView(
                message.getId(), message.getThread().getId(), message.getSender().getId(),
                message.getRecipient().getId(), message.getBody(), message.getSentAt(), message.getReadAt());
    }

    private static ResponseStatusException forbidden() {
        return new ResponseStatusException(HttpStatus.FORBIDDEN, "An active grant and thread participation are required");
    }

    public record ThreadSummary(
            UUID id,
            UUID submissionId,
            UUID studentId,
            UUID externalMentorId,
            String externalMentorName,
            String participantName,
            Instant createdAt,
            long unreadCount) {
    }

    public record MessageView(
            UUID id,
            UUID threadId,
            UUID senderId,
            UUID recipientId,
            String body,
            Instant sentAt,
            Instant readAt) {
    }

    public record ThreadMessages(ThreadSummary thread, List<MessageView> messages) {
    }

    public record UnreadCount(long unreadCount) {
    }
}