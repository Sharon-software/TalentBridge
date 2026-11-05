package com.sharonsoftware.talentbridge.config;

import com.sharonsoftware.talentbridge.domain.Role;
import com.sharonsoftware.talentbridge.domain.StudentProfile;
import com.sharonsoftware.talentbridge.domain.User;
import com.sharonsoftware.talentbridge.repository.StudentProfileRepository;
import com.sharonsoftware.talentbridge.repository.UserRepository;
import java.time.LocalDate;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@Profile("demo")
public class DemoAccountSeeder implements ApplicationRunner {

    private static final List<DemoAccount> ACCOUNTS = List.of(
            new DemoAccount("student@talentbridge.example", "Student", Role.STUDENT),
            new DemoAccount("coach@talentbridge.example", "Coach", Role.COACH),
            new DemoAccount("mentor@talentbridge.example", "Mentor", Role.MENTOR),
            new DemoAccount("external-tutor@talentbridge.example", "External Tutor", Role.EXTERNAL_TUTOR),
            new DemoAccount("recruiter@talentbridge.example", "Recruiter", Role.RECRUITER),
            new DemoAccount("external-mentor@talentbridge.example", "External Mentor", Role.EXTERNAL_MENTOR),
            new DemoAccount("company@talentbridge.example", "Company", Role.EMPLOYER),
            new DemoAccount("admin@talentbridge.example", "Admin", Role.ADMIN));

    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final String demoPassword;

    public DemoAccountSeeder(
            UserRepository userRepository,
            StudentProfileRepository studentProfileRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.demo.password}") String demoPassword) {
        this.userRepository = userRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.passwordEncoder = passwordEncoder;
        this.demoPassword = demoPassword;
    }

    @Override
    public void run(ApplicationArguments args) {
        for (DemoAccount account : ACCOUNTS) {
            User user = userRepository.findByEmail(account.email()).orElseGet(() -> {
                User demoUser = new User();
                demoUser.setEmail(account.email());
                demoUser.setPasswordHash(passwordEncoder.encode(demoPassword));
                demoUser.setFirstName(account.name());
                demoUser.setLastName("Demo");
                demoUser.setRole(account.role());
                return userRepository.save(demoUser);
            });
            if (account.role() == Role.STUDENT && studentProfileRepository.findByUserId(user.getId()).isEmpty()) {
                StudentProfile profile = new StudentProfile();
                profile.setUser(user);
                profile.setStartDate(LocalDate.now().minusMonths(6));
                studentProfileRepository.save(profile);
            }
        }
    }

    private record DemoAccount(String email, String name, Role role) {
    }
}