package com.sharonsoftware.talentbridge.config;

import com.sharonsoftware.talentbridge.domain.Role;
import com.sharonsoftware.talentbridge.domain.User;
import com.sharonsoftware.talentbridge.repository.UserRepository;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@Profile("prod")
public class BootstrapAdminSeeder implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final String email;
    private final String password;

    public BootstrapAdminSeeder(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.bootstrap-admin.email}") String email,
            @Value("${app.bootstrap-admin.password}") String password) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.email = email;
        this.password = password;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (email.isBlank() || password.length() < 12) {
            throw new IllegalStateException("Set BOOTSTRAP_ADMIN_EMAIL and a BOOTSTRAP_ADMIN_PASSWORD of at least 12 characters");
        }
        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        var existingUser = userRepository.findByEmail(normalizedEmail);
        if (existingUser.isPresent()) {
            if (existingUser.get().getRole() != Role.ADMIN) {
                throw new IllegalStateException("The bootstrap admin email already belongs to a non-admin user");
            }
            return;
        }
        User admin = new User();
        admin.setEmail(normalizedEmail);
        admin.setPasswordHash(passwordEncoder.encode(password));
        admin.setFirstName("Platform");
        admin.setLastName("Admin");
        admin.setRole(Role.ADMIN);
        userRepository.save(admin);
    }
}