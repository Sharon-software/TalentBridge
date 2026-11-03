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
            Integer minYearsExperience,
            String skill) {
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

            return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
        };
    }
}