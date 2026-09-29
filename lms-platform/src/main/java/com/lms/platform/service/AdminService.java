package com.lms.platform.service;

import com.lms.platform.dto.CourseResponse;
import com.lms.platform.dto.EnrollmentResponse;
import com.lms.platform.dto.UserSummaryResponse;
import com.lms.platform.repository.CourseRepository;
import com.lms.platform.repository.EnrollmentRepository;
import com.lms.platform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminService {

    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;

    public List<UserSummaryResponse> listUsers() {
        return userRepository.findAll().stream().map(UserSummaryResponse::new).toList();
    }

    public List<CourseResponse> listCourses() {
        return courseRepository.findAll().stream().map(CourseResponse::new).toList();
    }

    public List<EnrollmentResponse> listEnrollments() {
        return enrollmentRepository.findAll().stream().map(EnrollmentResponse::new).toList();
    }
}
