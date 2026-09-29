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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Covers requirement #10: existing registration/login/course/enrollment APIs keep working. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthAndCourseFlowIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private ApiTestSupport api;

    @BeforeEach
    void setUp() {
        api = new ApiTestSupport(mockMvc, objectMapper);
    }

    @Test
    void registerLoginCreateCourseAndEnroll_endToEnd() throws Exception {
        String instructorToken = api.registerAndLogin("Ira Instructor", "ira@example.com", "password123", "INSTRUCTOR");
        String studentToken = api.registerAndLogin("Sam Student", "sam@example.com", "password123", "STUDENT");

        String courseBody = objectMapper.writeValueAsString(new java.util.HashMap<>() {{
            put("title", "Intro to Testing");
            put("description", "Learn to test things");
        }});

        var courseResult = mockMvc.perform(post("/api/courses")
                        .header("Authorization", api.bearer(instructorToken))
                        .contentType("application/json")
                        .content(courseBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Intro to Testing"))
                .andReturn();

        long courseId = objectMapper.readTree(courseResult.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(get("/api/courses"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/courses").header("Authorization", api.bearer(studentToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("Intro to Testing"));

        mockMvc.perform(post("/api/courses/" + courseId + "/enroll")
                        .header("Authorization", api.bearer(studentToken)))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/enrollments/my").header("Authorization", api.bearer(studentToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].courseId").value(courseId));

        mockMvc.perform(get("/api/dashboard").header("Authorization", api.bearer(studentToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("STUDENT"));
    }

    @Test
    void studentCannotCreateCourse() throws Exception {
        String studentToken = api.registerAndLogin("Nia Nobody", "nia@example.com", "password123", "STUDENT");

        String courseBody = objectMapper.writeValueAsString(new java.util.HashMap<>() {{
            put("title", "Unauthorized Course");
        }});

        mockMvc.perform(post("/api/courses")
                        .header("Authorization", api.bearer(studentToken))
                        .contentType("application/json")
                        .content(courseBody))
                .andExpect(status().isForbidden());
    }

    @Test
    void publicCannotRegisterAsAdmin() throws Exception {
        String body = objectMapper.writeValueAsString(new java.util.HashMap<>() {{
            put("name", "Fake Admin");
            put("email", "fakeadmin@example.com");
            put("password", "password123");
            put("role", "ADMIN");
        }});

        mockMvc.perform(post("/api/auth/register")
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isConflict());
    }
}
