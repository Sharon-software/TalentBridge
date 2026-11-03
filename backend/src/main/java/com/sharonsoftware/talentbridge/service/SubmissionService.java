package com.sharonsoftware.talentbridge.service;

import com.sharonsoftware.talentbridge.domain.Assignment;
import com.sharonsoftware.talentbridge.domain.StudentProfile;
import com.sharonsoftware.talentbridge.domain.Submission;
import com.sharonsoftware.talentbridge.domain.SubmissionStatus;
import com.sharonsoftware.talentbridge.domain.User;
import com.sharonsoftware.talentbridge.repository.AssignmentRepository;
import com.sharonsoftware.talentbridge.repository.StudentProfileRepository;
import com.sharonsoftware.talentbridge.repository.SubmissionRepository;
import com.sharonsoftware.talentbridge.storage.FileStorage;
import java.io.IOException;
import java.time.Instant;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
public class SubmissionService {

    private final AssignmentRepository assignmentRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final SubmissionRepository submissionRepository;
    private final FileStorage fileStorage;

    public SubmissionService(
            AssignmentRepository assignmentRepository,
            StudentProfileRepository studentProfileRepository,
            SubmissionRepository submissionRepository,
            FileStorage fileStorage) {
        this.assignmentRepository = assignmentRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.submissionRepository = submissionRepository;
        this.fileStorage = fileStorage;
    }

    public Submission submit(UUID assignmentId, User user, MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A non-empty file is required");
        }
        StudentProfile studentProfile = studentProfileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student profile not found"));
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Assignment not found"));
        if (assignment.getDueAt() == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Assignment has no deadline");
        }
        if (submissionRepository.existsByAssignmentIdAndStudentProfileId(assignmentId, studentProfile.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A submission already exists for this assignment");
        }

        Instant submittedAt = Instant.now();
        FileStorage.StoredFile storedFile = fileStorage.store(file);
        Submission submission = new Submission();
        submission.setAssignment(assignment);
        submission.setStudentProfile(studentProfile);
        submission.setSubmittedAt(submittedAt);
        submission.setStatus(submittedAt.isAfter(assignment.getDueAt()) ? SubmissionStatus.LATE : SubmissionStatus.ON_TIME);
        submission.setStorageKey(storedFile.storageKey());
        submission.setOriginalFilename(storedFile.originalFilename());
        submission.setContentType(storedFile.contentType());
        submission.setFileSize(storedFile.size());
        return submissionRepository.save(submission);
    }
}