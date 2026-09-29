package com.lms.platform.service;

import com.lms.platform.dto.CourseRequest;
import com.lms.platform.dto.CourseResponse;
import com.lms.platform.entity.Course;
import com.lms.platform.entity.User;
import com.lms.platform.exception.ResourceNotFoundException;
import com.lms.platform.repository.CourseRepository;
import com.lms.platform.security.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class CourseService {

    private final CourseRepository courseRepository;
    private final CurrentUserProvider currentUserProvider;

    public CourseResponse createCourse(CourseRequest request) {
        User instructor = currentUserProvider.getUser();
        Course course = new Course();
        course.setTitle(request.getTitle());
        course.setDescription(request.getDescription());
        course.setInstructor(instructor);
        courseRepository.save(course);
        return new CourseResponse(course);
    }

    public List<CourseResponse> listCourses() {
        return courseRepository.findAll().stream().map(CourseResponse::new).toList();
    }

    public CourseResponse getCourse(Long id) {
        return new CourseResponse(findCourseOrThrow(id));
    }

    public Course findCourseOrThrow(Long id) {
        return courseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));
    }
}
