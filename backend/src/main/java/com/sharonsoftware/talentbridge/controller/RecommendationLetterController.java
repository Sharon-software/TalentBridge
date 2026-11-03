package com.sharonsoftware.talentbridge.controller;

import com.sharonsoftware.talentbridge.domain.RecommendationLetter;
import com.sharonsoftware.talentbridge.domain.RecommendationLetterStatus;
import com.sharonsoftware.talentbridge.domain.Role;
import com.sharonsoftware.talentbridge.domain.StudentProfile;
import com.sharonsoftware.talentbridge.domain.User;
import com.sharonsoftware.talentbridge.repository.RecommendationLetterRepository;
import com.sharonsoftware.talentbridge.repository.StudentProfileRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/recommendation-letters")
public class RecommendationLetterController {

    private final RecommendationLetterRepository letterRepository;
    private final StudentProfileRepository studentProfileRepository;

    public RecommendationLetterController(
            RecommendationLetterRepository letterRepository,
            StudentProfileRepository studentProfileRepository) {
        this.letterRepository = letterRepository;
        this.studentProfileRepository = studentProfileRepository;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('MENTOR', 'COACH')")
    public LetterResponse createDraft(
            @Valid @RequestBody CreateLetterRequest request,
            @AuthenticationPrincipal User author) {
        StudentProfile profile = studentProfileRepository.findById(request.studentProfileId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student profile not found"));
        RecommendationLetter letter = new RecommendationLetter();
        letter.setStudentProfile(profile);
        letter.setAuthor(author);
        letter.setAuthorName(author.getFirstName() + " " + author.getLastName());
        letter.setContent(request.content().trim());
        letter.setStatus(RecommendationLetterStatus.DRAFT);
        return toResponse(letterRepository.save(letter));
    }

    @PutMapping("/{letterId}")
    @PreAuthorize("hasAnyRole('MENTOR', 'COACH')")
    public LetterResponse updateDraft(
            @PathVariable UUID letterId,
            @Valid @RequestBody UpdateLetterRequest request,
            @AuthenticationPrincipal User author) {
        RecommendationLetter letter = findAuthoredLetter(letterId, author.getId());
        if (letter.getStatus() != RecommendationLetterStatus.DRAFT) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Published letters cannot be edited");
        }
        letter.setContent(request.content().trim());
        return toResponse(letterRepository.save(letter));
    }

    @PostMapping("/{letterId}/publish")
    @PreAuthorize("hasAnyRole('MENTOR', 'COACH')")
    public LetterResponse publish(@PathVariable UUID letterId, @AuthenticationPrincipal User author) {
        RecommendationLetter letter = findAuthoredLetter(letterId, author.getId());
        if (letter.getStatus() == RecommendationLetterStatus.PUBLISHED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Letter is already published");
        }
        letter.setStatus(RecommendationLetterStatus.PUBLISHED);
        letter.setPublishedAt(Instant.now());
        return toResponse(letterRepository.save(letter));
    }

    @GetMapping("/mine")
    @PreAuthorize("hasRole('STUDENT')")
    public List<LetterResponse> publishedForStudent(@AuthenticationPrincipal User student) {
        StudentProfile profile = studentProfileRepository.findByUserId(student.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student profile not found"));
        return letterRepository.findAllByStudentProfileIdAndStatusOrderByPublishedAtDesc(
                        profile.getId(), RecommendationLetterStatus.PUBLISHED)
                .stream().map(RecommendationLetterController::toResponse).toList();
    }

    @GetMapping("/{letterId}")
    @PreAuthorize("hasAnyRole('STUDENT', 'MENTOR', 'COACH')")
    public LetterResponse get(@PathVariable UUID letterId, @AuthenticationPrincipal User user) {
        RecommendationLetter letter = letterRepository.findById(letterId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Recommendation letter not found"));
        if (user.getRole() == Role.STUDENT) {
            if (letter.getStatus() != RecommendationLetterStatus.PUBLISHED
                || !letterRepository.existsByIdAndStudentProfileUserIdAndStatus(
                    letterId, user.getId(), RecommendationLetterStatus.PUBLISHED)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Letter is not published for this student");
            }
        } else if (letter.getAuthor() == null || !letter.getAuthor().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the author can view this letter");
        }
        return toResponse(letter);
    }

    private RecommendationLetter findAuthoredLetter(UUID letterId, UUID authorId) {
        return letterRepository.findByIdAndAuthorId(letterId, authorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the author can manage this letter"));
    }

    private static LetterResponse toResponse(RecommendationLetter letter) {
        return new LetterResponse(
                letter.getId(), letter.getStudentProfile().getId(), letter.getAuthorName(), letter.getContent(),
                letter.getStatus(), letter.getCreatedAt(), letter.getPublishedAt());
    }

    public record CreateLetterRequest(
            @NotNull UUID studentProfileId,
            @NotBlank @Size(max = 20000) String content) {
    }

    public record UpdateLetterRequest(@NotBlank @Size(max = 20000) String content) {
    }

    public record LetterResponse(
            UUID id,
            UUID studentProfileId,
            String authorName,
            String content,
            RecommendationLetterStatus status,
            Instant createdAt,
            Instant publishedAt) {
    }
}