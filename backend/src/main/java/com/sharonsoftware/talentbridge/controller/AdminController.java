package com.sharonsoftware.talentbridge.controller;

import com.sharonsoftware.talentbridge.domain.Cohort;
import com.sharonsoftware.talentbridge.domain.Role;
import com.sharonsoftware.talentbridge.domain.User;
import com.sharonsoftware.talentbridge.repository.CohortRepository;
import com.sharonsoftware.talentbridge.repository.UserRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final UserRepository userRepository;
    private final CohortRepository cohortRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminController(
            UserRepository userRepository,
            CohortRepository cohortRepository,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.cohortRepository = cohortRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping("/users")
    public List<UserResponse> listUsers() {
        return userRepository.findAll().stream().map(AdminController::toResponse).toList();
    }

    @PostMapping("/users")
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse createUser(@Valid @RequestBody CreateUserRequest request) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        if (userRepository.findByEmail(email).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already registered");
        }
        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setFirstName(request.firstName().trim());
        user.setLastName(request.lastName().trim());
        user.setRole(request.role());
        return toResponse(userRepository.save(user));
    }

    @PatchMapping("/users/{id}/role")
    public UserResponse assignRole(@PathVariable UUID id, @Valid @RequestBody AssignRoleRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        user.setRole(request.role());
        return toResponse(userRepository.save(user));
    }

    @GetMapping("/cohorts")
    public List<CohortResponse> listCohorts() {
        return cohortRepository.findAll().stream().map(AdminController::toResponse).toList();
    }

    @GetMapping("/cohorts/{id}")
    public CohortResponse getCohort(@PathVariable UUID id) {
        return toResponse(findCohort(id));
    }

    @PostMapping("/cohorts")
    @ResponseStatus(HttpStatus.CREATED)
    public CohortResponse createCohort(@Valid @RequestBody CohortRequest request) {
        validateDateRange(request.startDate(), request.endDate());
        if (cohortRepository.existsByName(request.name().trim())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cohort name already exists");
        }
        Cohort cohort = new Cohort();
        apply(cohort, request);
        return toResponse(cohortRepository.save(cohort));
    }

    @PutMapping("/cohorts/{id}")
    public CohortResponse updateCohort(@PathVariable UUID id, @Valid @RequestBody CohortRequest request) {
        validateDateRange(request.startDate(), request.endDate());
        Cohort cohort = findCohort(id);
        if (cohortRepository.existsByNameAndIdNot(request.name().trim(), id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cohort name already exists");
        }
        apply(cohort, request);
        return toResponse(cohortRepository.save(cohort));
    }

    @DeleteMapping("/cohorts/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCohort(@PathVariable UUID id) {
        Cohort cohort = findCohort(id);
        try {
            cohortRepository.delete(cohort);
        } catch (org.springframework.dao.DataIntegrityViolationException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cohort is in use", exception);
        }
    }

    private Cohort findCohort(UUID id) {
        return cohortRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cohort not found"));
    }

    private static void validateDateRange(LocalDate startDate, LocalDate endDate) {
        if (startDate != null && endDate != null && endDate.isBefore(startDate)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cohort end date must not precede start date");
        }
    }

    private static void apply(Cohort cohort, CohortRequest request) {
        cohort.setName(request.name().trim());
        cohort.setStartDate(request.startDate());
        cohort.setEndDate(request.endDate());
    }

    private static UserResponse toResponse(User user) {
        return new UserResponse(user.getId(), user.getEmail(), user.getFirstName(), user.getLastName(), user.getRole());
    }

    private static CohortResponse toResponse(Cohort cohort) {
        return new CohortResponse(cohort.getId(), cohort.getName(), cohort.getStartDate(), cohort.getEndDate());
    }

    public record CreateUserRequest(
            @NotBlank @Email @Size(max = 320) String email,
            @NotBlank @Size(min = 8, max = 72) String password,
            @NotBlank @Size(max = 100) String firstName,
            @NotBlank @Size(max = 100) String lastName,
            @NotNull Role role) {
    }

    public record AssignRoleRequest(@NotNull Role role) {
    }

    public record CohortRequest(
            @NotBlank @Size(max = 150) String name,
            LocalDate startDate,
            LocalDate endDate) {
    }

    public record UserResponse(UUID id, String email, String firstName, String lastName, Role role) {
    }

    public record CohortResponse(UUID id, String name, LocalDate startDate, LocalDate endDate) {
    }
}