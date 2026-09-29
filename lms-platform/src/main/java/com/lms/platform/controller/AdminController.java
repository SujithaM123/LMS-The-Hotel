package com.lms.platform.controller;

import com.lms.platform.dto.CourseResponse;
import com.lms.platform.dto.EnrollmentResponse;
import com.lms.platform.dto.UserSummaryResponse;
import com.lms.platform.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/users")
    public ResponseEntity<List<UserSummaryResponse>> listUsers() {
        return ResponseEntity.ok(adminService.listUsers());
    }

    @GetMapping("/courses")
    public ResponseEntity<List<CourseResponse>> listCourses() {
        return ResponseEntity.ok(adminService.listCourses());
    }

    @GetMapping("/enrollments")
    public ResponseEntity<List<EnrollmentResponse>> listEnrollments() {
        return ResponseEntity.ok(adminService.listEnrollments());
    }
}
