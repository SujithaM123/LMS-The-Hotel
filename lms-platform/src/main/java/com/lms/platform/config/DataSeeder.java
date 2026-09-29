package com.lms.platform.config;

import com.lms.platform.entity.Role;
import com.lms.platform.entity.RoleName;
import com.lms.platform.entity.User;
import com.lms.platform.repository.RoleRepository;
import com.lms.platform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@Order(1)
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.email:admin@lms.local}")
    private String adminEmail;

    @Value("${app.admin.password:ChangeMe123!}")
    private String adminPassword;

    @Override
    public void run(String... args) {
        for (RoleName roleName : RoleName.values()) {
            roleRepository.findByName(roleName).orElseGet(() -> roleRepository.save(new Role(roleName)));
        }

        if (!userRepository.existsByEmail(adminEmail)) {
            Role adminRole = roleRepository.findByName(RoleName.ADMIN).orElseThrow();
            User admin = new User();
            admin.setName("System Admin");
            admin.setEmail(adminEmail);
            admin.setPassword(passwordEncoder.encode(adminPassword));
            admin.setRole(adminRole);
            userRepository.save(admin);
        }
    }
}
