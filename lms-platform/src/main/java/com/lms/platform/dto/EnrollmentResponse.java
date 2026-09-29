package com.lms.platform.dto;

import com.lms.platform.entity.Enrollment;
import lombok.Getter;

import java.time.Instant;

@Getter
public class EnrollmentResponse {
    private final Long id;
    private final Long courseId;
    private final String courseTitle;
    private final Long studentId;
    private final String studentName;
    private final Instant enrolledAt;

    public EnrollmentResponse(Enrollment enrollment) {
        this.id = enrollment.getId();
        this.courseId = enrollment.getCourse().getId();
        this.courseTitle = enrollment.getCourse().getTitle();
        this.studentId = enrollment.getStudent().getId();
        this.studentName = enrollment.getStudent().getName();
        this.enrolledAt = enrollment.getEnrolledAt();
    }
}
