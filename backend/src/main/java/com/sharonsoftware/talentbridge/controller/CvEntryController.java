package com.sharonsoftware.talentbridge.controller;

import com.sharonsoftware.talentbridge.domain.CvEntry;
import com.sharonsoftware.talentbridge.domain.StudentProfile;
import com.sharonsoftware.talentbridge.domain.User;
import com.sharonsoftware.talentbridge.repository.CvEntryRepository;
import com.sharonsoftware.talentbridge.repository.StudentProfileRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
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
@RequestMapping("/api/cv")
@PreAuthorize("hasRole('STUDENT')")
public class CvEntryController {

    private final CvEntryRepository cvEntryRepository;
    private final StudentProfileRepository studentProfileRepository;

    public CvEntryController(CvEntryRepository cvEntryRepository, StudentProfileRepository studentProfileRepository) {
        this.cvEntryRepository = cvEntryRepository;
        this.studentProfileRepository = studentProfileRepository;
    }

    @GetMapping
    public List<CvEntryResponse> list(@AuthenticationPrincipal User user) {
        return cvEntryRepository.findAllByStudentProfileUserIdOrderByStartDateDesc(user.getId())
                .stream().map(CvEntryController::toResponse).toList();
    }

    @GetMapping("/{entryId}")
    public CvEntryResponse get(@PathVariable UUID entryId, @AuthenticationPrincipal User user) {
        return toResponse(findOwnedEntry(entryId, user.getId()));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CvEntryResponse create(@Valid @RequestBody CvEntryRequest request, @AuthenticationPrincipal User user) {
        validateDates(request.startDate(), request.endDate());
        StudentProfile profile = studentProfileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student profile not found"));
        CvEntry entry = new CvEntry();
        entry.setStudentProfile(profile);
        apply(entry, request);
        return toResponse(cvEntryRepository.save(entry));
    }

    @PutMapping("/{entryId}")
    public CvEntryResponse update(
            @PathVariable UUID entryId,
            @Valid @RequestBody CvEntryRequest request,
            @AuthenticationPrincipal User user) {
        validateDates(request.startDate(), request.endDate());
        CvEntry entry = findOwnedEntry(entryId, user.getId());
        apply(entry, request);
        return toResponse(cvEntryRepository.save(entry));
    }

    @DeleteMapping("/{entryId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID entryId, @AuthenticationPrincipal User user) {
        cvEntryRepository.delete(findOwnedEntry(entryId, user.getId()));
    }

    private CvEntry findOwnedEntry(UUID entryId, UUID userId) {
        return cvEntryRepository.findByIdAndStudentProfileUserId(entryId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "CV entry does not belong to this student"));
    }

    private static void validateDates(LocalDate startDate, LocalDate endDate) {
        if (startDate != null && endDate != null && endDate.isBefore(startDate)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "End date must not precede start date");
        }
    }

    private static void apply(CvEntry entry, CvEntryRequest request) {
        entry.setTitle(request.title().trim());
        entry.setOrganization(request.organization() == null ? null : request.organization().trim());
        entry.setDescription(request.description());
        entry.setStartDate(request.startDate());
        entry.setEndDate(request.endDate());
        entry.setSkills(normalizeSkills(request.skills()));
    }

    private static LinkedHashSet<String> normalizeSkills(List<String> skills) {
        if (skills == null) {
            return new LinkedHashSet<>();
        }
        return skills.stream()
                .filter(skill -> skill != null && !skill.isBlank())
                .map(String::trim)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private static CvEntryResponse toResponse(CvEntry entry) {
        return new CvEntryResponse(entry.getId(), entry.getTitle(), entry.getOrganization(),
            entry.getDescription(), entry.getStartDate(), entry.getEndDate(), List.copyOf(entry.getSkills()));
    }

    public record CvEntryRequest(
            @NotBlank @Size(max = 200) String title,
            @Size(max = 200) String organization,
            @Size(max = 10000) String description,
            LocalDate startDate,
            LocalDate endDate,
            List<@Size(max = 100) String> skills) {
    }

    public record CvEntryResponse(
            UUID id,
            String title,
            String organization,
            String description,
            LocalDate startDate,
            LocalDate endDate,
            List<String> skills) {
    }
}