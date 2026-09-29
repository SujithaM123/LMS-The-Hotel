package com.lms.platform.support;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Small helper shared by the integration tests: registers users and extracts JWTs via the real HTTP API. */
public class ApiTestSupport {

    private final MockMvc mockMvc;
    private final ObjectMapper objectMapper;

    public ApiTestSupport(MockMvc mockMvc, ObjectMapper objectMapper) {
        this.mockMvc = mockMvc;
        this.objectMapper = objectMapper;
    }

    public String registerAndLogin(String name, String email, String password, String role) throws Exception {
        String body = objectMapper.writeValueAsString(new java.util.HashMap<>() {{
            put("name", name);
            put("email", email);
            put("password", password);
            put("role", role);
        }});

        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode node = objectMapper.readTree(result.getResponse().getContentAsString());
        return node.get("token").asText();
    }

    public String bearer(String token) {
        return "Bearer " + token;
    }
}
