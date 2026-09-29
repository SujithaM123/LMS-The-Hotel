package com.lms.platform.config;

import com.lms.platform.entity.*;
import com.lms.platform.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Populates realistic-looking demo content (instructors, students, courses, enrollments,
 * notifications, messages) so a freshly opened frontend isn't blank. Dev-only, and only runs
 * once - guarded by an existing-course check - so restarting the app doesn't duplicate data.
 */
@Component
@Profile("dev")
@Order(2)
@RequiredArgsConstructor
public class DemoDataSeeder implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final NotificationRepository notificationRepository;
    private final MessageRepository messageRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (courseRepository.count() > 0) {
            return;
        }

        Role instructorRole = roleRepository.findByName(RoleName.INSTRUCTOR).orElseThrow();
        Role studentRole = roleRepository.findByName(RoleName.STUDENT).orElseThrow();

        User priya = createUser("Priya Sharma", "priya.instructor@lms.local", instructorRole);
        User rahul = createUser("Rahul Verma", "rahul.instructor@lms.local", instructorRole);

        User aditya = createUser("Aditya Kumar", "aditya.student@lms.local", studentRole);
        User meera = createUser("Meera Iyer", "meera.student@lms.local", studentRole);
        User sanjay = createUser("Sanjay Patel", "sanjay.student@lms.local", studentRole);

        Course dataStructures = createCourse(priya, "Introduction to Data Structures",
                "Arrays, linked lists, stacks, queues, trees and graphs with hands-on exercises.");
        Course webDev = createCourse(priya, "Web Development Bootcamp",
                "Build full-stack web apps with HTML, CSS, JavaScript and REST APIs.");
        Course machineLearning = createCourse(rahul, "Machine Learning Fundamentals",
                "Supervised and unsupervised learning, model evaluation, and practical projects.");

        enroll(aditya, dataStructures);
        enroll(aditya, webDev);
        enroll(meera, webDev);
        enroll(meera, machineLearning);
        enroll(sanjay, dataStructures);

        Notification readOne = notify(aditya,
                "Reminder: Week 1 assignment for \"" + dataStructures.getTitle() + "\" is due Friday.",
                NotificationType.COURSE);
        readOne.setRead(true);
        notificationRepository.save(readOne);

        sendMessage(priya, aditya, dataStructures,
                "Welcome to the course! Let me know if you have any questions getting started.");
        sendMessage(rahul, meera, machineLearning,
                "Please complete the first assignment by Friday - happy to help if you get stuck.");
    }

    private User createUser(String name, String email, Role role) {
        User user = new User();
        user.setName(name);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(
                role.getName() == RoleName.INSTRUCTOR ? "Instructor123!" : "Student123!"));
        user.setRole(role);
        return userRepository.save(user);
    }

    private Course createCourse(User instructor, String title, String description) {
        Course course = new Course();
        course.setTitle(title);
        course.setDescription(description);
        course.setInstructor(instructor);
        return courseRepository.save(course);
    }

    private void enroll(User student, Course course) {
        Enrollment enrollment = new Enrollment();
        enrollment.setStudent(student);
        enrollment.setCourse(course);
        enrollmentRepository.save(enrollment);

        notify(student, "You have enrolled in \"" + course.getTitle() + "\"", NotificationType.ENROLLMENT);
        notify(course.getInstructor(),
                student.getName() + " enrolled in your course \"" + course.getTitle() + "\"",
                NotificationType.ENROLLMENT);
    }

    private Notification notify(User user, String content, NotificationType type) {
        Notification notification = new Notification();
        notification.setUser(user);
        notification.setContent(content);
        notification.setType(type);
        return notificationRepository.save(notification);
    }

    private void sendMessage(User sender, User recipient, Course course, String content) {
        Message message = new Message();
        message.setSender(sender);
        message.setRecipient(recipient);
        message.setCourse(course);
        message.setContent(content);
        messageRepository.save(message);

        notify(recipient, "New message from " + sender.getName() + " (" + course.getTitle() + ")",
                NotificationType.MESSAGE);
    }
}
