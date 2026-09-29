package com.lms.platform.security;

import com.lms.platform.entity.User;
import com.lms.platform.exception.ResourceNotFoundException;
import com.lms.platform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CurrentUserProvider {

    private final UserRepository userRepository;

    public UserPrincipal getPrincipal() {
        return (UserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    public User getUser() {
        Long id = getPrincipal().getId();
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user no longer exists"));
    }
}
