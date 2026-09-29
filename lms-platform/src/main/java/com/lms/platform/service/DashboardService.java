package com.lms.platform.service;

import com.lms.platform.dto.CourseResponse;
import com.lms.platform.dto.DashboardResponse;
import com.lms.platform.entity.RoleName;
import com.lms.platform.entity.User;
import com.lms.platform.repository.CourseRepository;
import com.lms.platform.repository.EnrollmentRepository;
import com.lms.platform.repository.NotificationRepository;
import com.lms.platform.repository.UserRepository;
import com.lms.platform.security.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardService {

    private final CurrentUserProvider currentUserProvider;
    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final EnrollmentService enrollmentService;

    public DashboardResponse getDashboard() {
        User user = currentUserProvider.getUser();
        DashboardResponse response = new DashboardResponse();
        response.setRole(user.getRole().getName().name());

        long unread = notificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
                .filter(n -> !n.isRead())
                .count();
        response.setUnreadNotificationCount(unread);

        RoleName role = user.getRole().getName();
        if (role == RoleName.STUDENT) {
            response.setEnrollments(enrollmentService.listMyEnrollments());
        } else if (role == RoleName.INSTRUCTOR) {
            var courses = courseRepository.findByInstructorId(user.getId());
            response.setCreatedCourses(courses.stream().map(CourseResponse::new).toList());
            long totalStudents = courses.stream()
                    .mapToLong(c -> enrollmentRepository.findByCourseId(c.getId()).size())
                    .sum();
            response.setTotalEnrolledStudents(totalStudents);
        } else if (role == RoleName.ADMIN) {
            response.setTotalUsers(userRepository.count());
            response.setTotalCourses(courseRepository.count());
            response.setTotalEnrollments(enrollmentRepository.count());
        }

        return response;
    }
}
