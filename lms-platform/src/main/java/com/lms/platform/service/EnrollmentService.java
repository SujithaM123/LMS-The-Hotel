package com.lms.platform.service;

import com.lms.platform.dto.EnrollmentResponse;
import com.lms.platform.entity.Course;
import com.lms.platform.entity.Enrollment;
import com.lms.platform.entity.NotificationType;
import com.lms.platform.entity.RoleName;
import com.lms.platform.entity.User;
import com.lms.platform.exception.ConflictException;
import com.lms.platform.exception.ForbiddenActionException;
import com.lms.platform.repository.EnrollmentRepository;
import com.lms.platform.security.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class EnrollmentService {

    private final EnrollmentRepository enrollmentRepository;
    private final CourseService courseService;
    private final CurrentUserProvider currentUserProvider;
    private final NotificationService notificationService;

    public EnrollmentResponse enroll(Long courseId) {
        User student = currentUserProvider.getUser();
        Course course = courseService.findCourseOrThrow(courseId);

        if (enrollmentRepository.existsByStudentIdAndCourseId(student.getId(), courseId)) {
            throw new ConflictException("Already enrolled in this course");
        }

        Enrollment enrollment = new Enrollment();
        enrollment.setStudent(student);
        enrollment.setCourse(course);
        enrollmentRepository.save(enrollment);

        notificationService.notify(student,
                "You have enrolled in \"" + course.getTitle() + "\"", NotificationType.ENROLLMENT);
        notificationService.notify(course.getInstructor(),
                student.getName() + " enrolled in your course \"" + course.getTitle() + "\"", NotificationType.ENROLLMENT);

        return new EnrollmentResponse(enrollment);
    }

    public List<EnrollmentResponse> listMyEnrollments() {
        Long studentId = currentUserProvider.getPrincipal().getId();
        return enrollmentRepository.findByStudentId(studentId).stream()
                .map(EnrollmentResponse::new)
                .toList();
    }

    /** Instructors (for their own course) or admins may view the enrolled students of a course. */
    public List<EnrollmentResponse> listStudentsForCourse(Long courseId) {
        Course course = courseService.findCourseOrThrow(courseId);
        User current = currentUserProvider.getUser();

        boolean isOwningInstructor = current.getRole().getName() == RoleName.INSTRUCTOR
                && course.getInstructor().getId().equals(current.getId());
        boolean isAdmin = current.getRole().getName() == RoleName.ADMIN;

        if (!isOwningInstructor && !isAdmin) {
            throw new ForbiddenActionException("You are not permitted to view enrollments for this course");
        }

        return enrollmentRepository.findByCourseId(courseId).stream()
                .map(EnrollmentResponse::new)
                .toList();
    }

    public boolean isStudentEnrolledInCourse(Long studentId, Long courseId) {
        return enrollmentRepository.existsByStudentIdAndCourseId(studentId, courseId);
    }
}
