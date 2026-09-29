package com.lms.platform.dto;

import com.lms.platform.entity.Course;
import lombok.Getter;

import java.time.Instant;

@Getter
public class CourseResponse {
    private final Long id;
    private final String title;
    private final String description;
    private final Long instructorId;
    private final String instructorName;
    private final Instant createdAt;

    public CourseResponse(Course course) {
        this.id = course.getId();
        this.title = course.getTitle();
        this.description = course.getDescription();
        this.instructorId = course.getInstructor().getId();
        this.instructorName = course.getInstructor().getName();
        this.createdAt = course.getCreatedAt();
    }
}
