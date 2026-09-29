package com.lms.platform.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class DashboardResponse {
    private String role;
    private long unreadNotificationCount;

    // STUDENT
    private List<EnrollmentResponse> enrollments;

    // INSTRUCTOR
    private List<CourseResponse> createdCourses;
    private long totalEnrolledStudents;

    // ADMIN
    private long totalUsers;
    private long totalCourses;
    private long totalEnrollments;
}
