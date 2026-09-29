package com.lms.platform;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lms.platform.support.ApiTestSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Covers requirement scenarios 1-4:
 * a student can read/mark-read only their own notifications, never another user's.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class NotificationSecurityIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private ApiTestSupport api;

    @BeforeEach
    void setUp() {
        api = new ApiTestSupport(mockMvc, objectMapper);
    }

    private long enrollAndCaptureCourse(String instructorToken, String studentToken) throws Exception {
        String courseBody = objectMapper.writeValueAsString(new java.util.HashMap<>() {{
            put("title", "Notifications 101");
        }});
        MvcResult courseResult = mockMvc.perform(post("/api/courses")
                        .header("Authorization", api.bearer(instructorToken))
                        .contentType("application/json")
                        .content(courseBody))
                .andExpect(status().isCreated())
                .andReturn();
        long courseId = objectMapper.readTree(courseResult.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(post("/api/courses/" + courseId + "/enroll")
                        .header("Authorization", api.bearer(studentToken)))
                .andExpect(status().isCreated());

        return courseId;
    }

    @Test
    void studentCanRetrieveOnlyTheirOwnNotifications() throws Exception {
        String instructorToken = api.registerAndLogin("Ivy Instructor", "ivy@example.com", "password123", "INSTRUCTOR");
        String studentAToken = api.registerAndLogin("Alice Student", "alice@example.com", "password123", "STUDENT");
        String studentBToken = api.registerAndLogin("Bob Student", "bob@example.com", "password123", "STUDENT");

        enrollAndCaptureCourse(instructorToken, studentAToken);
        // Bob does NOT enroll, so Bob should have no enrollment notification.

        mockMvc.perform(get("/api/notifications").header("Authorization", api.bearer(studentAToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].content").value(org.hamcrest.Matchers.containsString("enrolled")));

        mockMvc.perform(get("/api/notifications").header("Authorization", api.bearer(studentBToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(0));

        mockMvc.perform(get("/api/notifications"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void studentCanMarkOwnNotificationAsReadButNotAnotherUsers() throws Exception {
        String instructorToken = api.registerAndLogin("Ida Instructor", "ida@example.com", "password123", "INSTRUCTOR");
        String studentAToken = api.registerAndLogin("Carol Student", "carol@example.com", "password123", "STUDENT");
        String studentBToken = api.registerAndLogin("Dave Student", "dave@example.com", "password123", "STUDENT");

        enrollAndCaptureCourse(instructorToken, studentAToken);

        MvcResult listResult = mockMvc.perform(get("/api/notifications").header("Authorization", api.bearer(studentAToken)))
                .andExpect(status().isOk())
                .andReturn();
        long notificationId = objectMapper.readTree(listResult.getResponse().getContentAsString()).get(0).get("id").asLong();

        // Student B cannot mark Student A's notification as read - must not leak that it exists.
        mockMvc.perform(put("/api/notifications/" + notificationId + "/read")
                        .header("Authorization", api.bearer(studentBToken)))
                .andExpect(status().isNotFound());

        // Student A can mark their own notification as read.
        mockMvc.perform(put("/api/notifications/" + notificationId + "/read")
                        .header("Authorization", api.bearer(studentAToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.read").value(true));
    }
}
