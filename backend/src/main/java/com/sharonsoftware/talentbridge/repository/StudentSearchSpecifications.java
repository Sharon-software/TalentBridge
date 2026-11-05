package com.sharonsoftware.talentbridge.repository;

import com.sharonsoftware.talentbridge.domain.CvEntry;
import com.sharonsoftware.talentbridge.domain.Qualification;
import com.sharonsoftware.talentbridge.domain.StudentProfile;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.SetJoin;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

public final class StudentSearchSpecifications {

    private StudentSearchSpecifications() {
    }

    public static Specification<StudentProfile> talentSearch(
            LocalDate eligibleStartDate,
            String qualification,
            List<String> qualifications,
            Integer minYearsExperience,
            String skill,
            String search) {
        return (profile, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(criteriaBuilder.lessThanOrEqualTo(profile.get("startDate"), eligibleStartDate));

            if (qualification != null && !qualification.isBlank()) {
                var matchingQualifications = query.subquery(Integer.class);
                Root<Qualification> item = matchingQualifications.from(Qualification.class);
                matchingQualifications.select(criteriaBuilder.literal(1));
                matchingQualifications.where(
                        criteriaBuilder.equal(item.get("studentProfile").get("id"), profile.get("id")),
                        criteriaBuilder.like(criteriaBuilder.lower(item.get("name")),
                                "%" + qualification.trim().toLowerCase(Locale.ROOT) + "%"));
                predicates.add(criteriaBuilder.exists(matchingQualifications));
            }

            if (qualifications != null && !qualifications.isEmpty()) {
                List<String> normalizedQualifications = qualifications.stream()
                        .filter(value -> value != null && !value.isBlank())
                        .map(value -> value.trim().toLowerCase(Locale.ROOT))
                        .toList();
                if (!normalizedQualifications.isEmpty()) {
                    var matchingQualifications = query.subquery(Integer.class);
                    Root<Qualification> item = matchingQualifications.from(Qualification.class);
                    matchingQualifications.select(criteriaBuilder.literal(1));
                    matchingQualifications.where(
                            criteriaBuilder.equal(item.get("studentProfile").get("id"), profile.get("id")),
                            criteriaBuilder.lower(item.get("name")).in(normalizedQualifications));
                    predicates.add(criteriaBuilder.exists(matchingQualifications));
                }
            }

            if (minYearsExperience != null) {
                LocalDate experienceCutoff = LocalDate.now().minusYears(minYearsExperience);
                var experience = query.subquery(Integer.class);
                Root<CvEntry> entry = experience.from(CvEntry.class);
                experience.select(criteriaBuilder.literal(1));
                experience.where(
                        criteriaBuilder.equal(entry.get("studentProfile").get("id"), profile.get("id")),
                        criteriaBuilder.isNotNull(entry.get("startDate")),
                        criteriaBuilder.lessThanOrEqualTo(entry.get("startDate"), experienceCutoff));
                predicates.add(criteriaBuilder.exists(experience));
            }

            if (skill != null && !skill.isBlank()) {
                var matchingSkills = query.subquery(Integer.class);
                Root<CvEntry> entry = matchingSkills.from(CvEntry.class);
                SetJoin<CvEntry, String> skillValue = entry.joinSet("skills");
                matchingSkills.select(criteriaBuilder.literal(1));
                matchingSkills.where(
                        criteriaBuilder.equal(entry.get("studentProfile").get("id"), profile.get("id")),
                        criteriaBuilder.equal(criteriaBuilder.lower(skillValue), skill.trim().toLowerCase(Locale.ROOT)));
                predicates.add(criteriaBuilder.exists(matchingSkills));
            }

            if (search != null && !search.isBlank()) {
                String searchPattern = "%" + search.trim().toLowerCase(Locale.ROOT) + "%";
                var user = profile.get("user");
                var fullName = criteriaBuilder.lower(criteriaBuilder.concat(
                    criteriaBuilder.concat(user.get("firstName"), " "), user.get("lastName")));
                predicates.add(criteriaBuilder.or(
                    criteriaBuilder.like(fullName, searchPattern),
                        criteriaBuilder.like(criteriaBuilder.lower(user.get("firstName")), searchPattern),
                        criteriaBuilder.like(criteriaBuilder.lower(user.get("lastName")), searchPattern),
                        criteriaBuilder.like(criteriaBuilder.lower(user.get("email")), searchPattern)));
            }

                    if (!Long.class.equals(query.getResultType()) && !long.class.equals(query.getResultType())) {
                    query.orderBy(
                        criteriaBuilder.asc(criteriaBuilder.<Integer>selectCase()
                            .when(criteriaBuilder.isNull(profile.get("overallScore")), 1)
                            .otherwise(0)),
                        criteriaBuilder.desc(profile.get("overallScore")),
                        criteriaBuilder.asc(profile.get("id")));
                    }

            return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
        };
    }
}