package com.lms.platform.service;

import com.lms.platform.dto.MessageRequest;
import com.lms.platform.dto.MessageResponse;
import com.lms.platform.entity.Course;
import com.lms.platform.entity.Message;
import com.lms.platform.entity.NotificationType;
import com.lms.platform.entity.RoleName;
import com.lms.platform.entity.User;
import com.lms.platform.exception.ForbiddenActionException;
import com.lms.platform.exception.ResourceNotFoundException;
import com.lms.platform.repository.MessageRepository;
import com.lms.platform.repository.UserRepository;
import com.lms.platform.security.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class MessageService {

    private static final String MESSAGES_QUEUE = "/queue/messages";

    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final CourseService courseService;
    private final EnrollmentService enrollmentService;
    private final CurrentUserProvider currentUserProvider;
    private final NotificationService notificationService;
    private final RealtimePublisher realtimePublisher;

    public MessageResponse sendMessage(MessageRequest request) {
        User instructor = currentUserProvider.getUser();
        Course course = courseService.findCourseOrThrow(request.getCourseId());

        if (!course.getInstructor().getId().equals(instructor.getId())) {
            throw new ForbiddenActionException("You may only message students in courses you teach");
        }

        User student = userRepository.findById(request.getStudentId())
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));

        if (student.getRole().getName() != RoleName.STUDENT) {
            throw new ForbiddenActionException("Recipient is not a student");
        }

        if (!enrollmentService.isStudentEnrolledInCourse(student.getId(), course.getId())) {
            throw new ForbiddenActionException("This student is not enrolled in your course");
        }

        Message message = new Message();
        message.setSender(instructor);
        message.setRecipient(student);
        message.setCourse(course);
        message.setContent(request.getContent());
        messageRepository.save(message);
        MessageResponse response = new MessageResponse(message);

        realtimePublisher.sendToUser(student.getEmail(), MESSAGES_QUEUE, response);
        notificationService.notify(student,
                "New message from " + instructor.getName() + " (" + course.getTitle() + ")",
                NotificationType.MESSAGE);

        return response;
    }

    public MessageResponse getMessage(Long id) {
        Long userId = currentUserProvider.getPrincipal().getId();
        Message message = messageRepository.findById(id)
                // Same 404 for "doesn't exist" and "not yours" - prevents IDOR probing.
                .filter(m -> m.getSender().getId().equals(userId) || m.getRecipient().getId().equals(userId))
                .orElseThrow(() -> new ResourceNotFoundException("Message not found"));
        return new MessageResponse(message);
    }

    public List<MessageResponse> listForCurrentUser() {
        Long userId = currentUserProvider.getPrincipal().getId();
        return messageRepository.findBySenderIdOrRecipientIdOrderBySentAtDesc(userId, userId).stream()
                .map(MessageResponse::new)
                .toList();
    }
}
