package com.lms.platform.controller;

import com.lms.platform.dto.CourseRequest;
import com.lms.platform.dto.CourseResponse;
import com.lms.platform.dto.EnrollmentResponse;
import com.lms.platform.service.CourseService;
import com.lms.platform.service.EnrollmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/courses")
@RequiredArgsConstructor
public class CourseController {

    private final CourseService courseService;
    private final EnrollmentService enrollmentService;

    @PostMapping
    @PreAuthorize("hasRole('INSTRUCTOR')")
    public ResponseEntity<CourseResponse> createCourse(@Valid @RequestBody CourseRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(courseService.createCourse(request));
    }

    @GetMapping
    public ResponseEntity<List<CourseResponse>> listCourses() {
        return ResponseEntity.ok(courseService.listCourses());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CourseResponse> getCourse(@PathVariable Long id) {
        return ResponseEntity.ok(courseService.getCourse(id));
    }

    @PostMapping("/{id}/enroll")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<EnrollmentResponse> enroll(@PathVariable Long id) {
        return ResponseEntity.status(HttpStatus.CREATED).body(enrollmentService.enroll(id));
    }

    @GetMapping("/{id}/students")
    @PreAuthorize("hasAnyRole('INSTRUCTOR', 'ADMIN')")
    public ResponseEntity<List<EnrollmentResponse>> listStudents(@PathVariable Long id) {
        return ResponseEntity.ok(enrollmentService.listStudentsForCourse(id));
    }
}
