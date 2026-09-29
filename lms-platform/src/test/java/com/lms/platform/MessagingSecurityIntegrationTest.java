package com.lms.platform;

import com.fasterxml.jackson.databind.JsonNode;
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

import java.util.HashMap;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Covers requirement scenarios 5-9:
 * instructor -> enrolled-student messaging, rejection of non-enrolled/non-owned targets,
 * and IDOR-proof message retrieval.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class MessagingSecurityIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private ApiTestSupport api;

    @BeforeEach
    void setUp() {
        api = new ApiTestSupport(mockMvc, objectMapper);
    }

    private long createCourse(String instructorToken, String title) throws Exception {
        String body = objectMapper.writeValueAsString(new HashMap<>() {{
            put("title", title);
        }});
        MvcResult result = mockMvc.perform(post("/api/courses")
                        .header("Authorization", api.bearer(instructorToken))
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    }

    private void enroll(String studentToken, long courseId) throws Exception {
        mockMvc.perform(post("/api/courses/" + courseId + "/enroll")
                        .header("Authorization", api.bearer(studentToken)))
                .andExpect(status().isCreated());
    }

    private long resolveUserIdByEmail(String adminToken, String email) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/admin/users").header("Authorization", api.bearer(adminToken)))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode arr = objectMapper.readTree(result.getResponse().getContentAsString());
        for (JsonNode node : arr) {
            if (node.get("email").asText().equals(email)) {
                return node.get("id").asLong();
            }
        }
        throw new IllegalStateException("user not found: " + email);
    }

    private String loginAdmin() throws Exception {
        String body = objectMapper.writeValueAsString(new HashMap<>() {{
            put("email", "admin@lms.local");
            put("password", "ChangeMe123!");
        }});
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("token").asText();
    }

    @Test
    void instructorCanMessageEnrolledStudentButNotNonEnrolledStudent() throws Exception {
        String adminToken = loginAdmin();
        String instructorToken = api.registerAndLogin("Meg Instructor", "meg@example.com", "password123", "INSTRUCTOR");
        String enrolledStudentToken = api.registerAndLogin("Eve Enrolled", "eve@example.com", "password123", "STUDENT");
        String outsiderStudentToken = api.registerAndLogin("Oscar Outsider", "oscar@example.com", "password123", "STUDENT");

        long courseId = createCourse(instructorToken, "Messaging 101");
        enroll(enrolledStudentToken, courseId);

        long enrolledId = resolveUserIdByEmail(adminToken, "eve@example.com");
        long outsiderId = resolveUserIdByEmail(adminToken, "oscar@example.com");

        String messageToEnrolled = objectMapper.writeValueAsString(new HashMap<>() {{
            put("studentId", enrolledId);
            put("courseId", courseId);
            put("content", "Welcome to the course!");
        }});

        mockMvc.perform(post("/api/messages")
                        .header("Authorization", api.bearer(instructorToken))
                        .contentType("application/json")
                        .content(messageToEnrolled))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.recipientId").value(enrolledId));

        String messageToOutsider = objectMapper.writeValueAsString(new HashMap<>() {{
            put("studentId", outsiderId);
            put("courseId", courseId);
            put("content", "You shouldn't get this");
        }});

        mockMvc.perform(post("/api/messages")
                        .header("Authorization", api.bearer(instructorToken))
                        .contentType("application/json")
                        .content(messageToOutsider))
                .andExpect(status().isForbidden());

        // Students cannot send instructor-only messages.
        mockMvc.perform(post("/api/messages")
                        .header("Authorization", api.bearer(enrolledStudentToken))
                        .contentType("application/json")
                        .content(messageToEnrolled))
                .andExpect(status().isForbidden());
    }

    @Test
    void messageAccessIsRestrictedToSenderAndRecipientOnly() throws Exception {
        String adminToken = loginAdmin();
        String instructorToken = api.registerAndLogin("Ned Instructor", "ned@example.com", "password123", "INSTRUCTOR");
        String recipientToken = api.registerAndLogin("Rita Recipient", "rita@example.com", "password123", "STUDENT");
        String snoopToken = api.registerAndLogin("Sid Snoop", "sid@example.com", "password123", "STUDENT");

        long courseId = createCourse(instructorToken, "Privacy 101");
        enroll(recipientToken, courseId);
        long recipientId = resolveUserIdByEmail(adminToken, "rita@example.com");

        String body = objectMapper.writeValueAsString(new HashMap<>() {{
            put("studentId", recipientId);
            put("courseId", courseId);
            put("content", "Confidential note");
        }});

        MvcResult sendResult = mockMvc.perform(post("/api/messages")
                        .header("Authorization", api.bearer(instructorToken))
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn();
        long messageId = objectMapper.readTree(sendResult.getResponse().getContentAsString()).get("id").asLong();

        // Sender can read it.
        mockMvc.perform(get("/api/messages/" + messageId).header("Authorization", api.bearer(instructorToken)))
                .andExpect(status().isOk());

        // Recipient can read it.
        mockMvc.perform(get("/api/messages/" + messageId).header("Authorization", api.bearer(recipientToken)))
                .andExpect(status().isOk());

        // A third party cannot read it merely by guessing/incrementing the ID (IDOR check).
        mockMvc.perform(get("/api/messages/" + messageId).header("Authorization", api.bearer(snoopToken)))
                .andExpect(status().isNotFound());

        // Unauthenticated requests are rejected outright.
        mockMvc.perform(get("/api/messages/" + messageId))
                .andExpect(status().isUnauthorized());
    }
}
