package com.lms.platform.service;

import com.lms.platform.dto.AuthResponse;
import com.lms.platform.dto.LoginRequest;
import com.lms.platform.dto.RegisterRequest;
import com.lms.platform.entity.Role;
import com.lms.platform.entity.RoleName;
import com.lms.platform.entity.User;
import com.lms.platform.exception.ConflictException;
import com.lms.platform.repository.RoleRepository;
import com.lms.platform.repository.UserRepository;
import com.lms.platform.security.JwtUtil;
import com.lms.platform.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;

    public AuthResponse register(RegisterRequest request) {
        if (request.getRole() == RoleName.ADMIN) {
            throw new ConflictException("ADMIN accounts cannot be created through public registration");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ConflictException("An account with this email already exists");
        }

        Role role = roleRepository.findByName(request.getRole())
                .orElseThrow(() -> new IllegalStateException("Role not seeded: " + request.getRole()));

        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(role);
        userRepository.save(user);

        UserPrincipal principal = new UserPrincipal(user);
        String token = jwtUtil.generateToken(principal);
        return new AuthResponse(token, user.getId(), user.getName(), user.getEmail(), role.getName().name());
    }

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalStateException("Authenticated user vanished"));

        UserPrincipal principal = new UserPrincipal(user);
        String token = jwtUtil.generateToken(principal);
        return new AuthResponse(token, user.getId(), user.getName(), user.getEmail(), user.getRole().getName().name());
    }
}
