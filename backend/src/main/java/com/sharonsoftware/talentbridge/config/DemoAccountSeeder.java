package com.sharonsoftware.talentbridge.config;

import com.sharonsoftware.talentbridge.domain.Role;
import com.sharonsoftware.talentbridge.domain.User;
import com.sharonsoftware.talentbridge.repository.UserRepository;
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
            new DemoAccount("recruiter@talentbridge.example", "Recruiter", Role.RECRUITER),
            new DemoAccount("external-mentor@talentbridge.example", "External Mentor", Role.EXTERNAL_MENTOR));

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final String demoPassword;

    public DemoAccountSeeder(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.demo.password}") String demoPassword) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.demoPassword = demoPassword;
    }

    @Override
    public void run(ApplicationArguments args) {
        for (DemoAccount account : ACCOUNTS) {
            if (userRepository.findByEmail(account.email()).isPresent()) {
                continue;
            }
            User user = new User();
            user.setEmail(account.email());
            user.setPasswordHash(passwordEncoder.encode(demoPassword));
            user.setFirstName(account.name());
            user.setLastName("Demo");
            user.setRole(account.role());
            userRepository.save(user);
        }
    }

    private record DemoAccount(String email, String name, Role role) {
    }
}