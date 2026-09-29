package com.lms.platform;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.messaging.converter.MappingJackson2MessageConverter;
import org.springframework.messaging.simp.stomp.*;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;

import java.lang.reflect.Type;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Drives the WebSocket layer directly (real STOMP client over a real socket), not through the
 * UI, covering the security cases the Row 9 WebSocket spec calls out: CONNECT auth, SUBSCRIBE
 * restriction, and the full instructor/student SEND authorization matrix, reusing MessageService.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class WebSocketSecurityIntegrationTest {

    private static final String TEST_JWT_SECRET = "test-secret-key-for-jwt-signing-must-be-at-least-32-bytes-long";

    @Value("${local.server.port}")
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private String wsUrl() {
        return "ws://localhost:" + port + "/ws";
    }

    private String register(String name, String email, String password, String role) {
        Map<String, String> body = new HashMap<>();
        body.put("name", name);
        body.put("email", email);
        body.put("password", password);
        body.put("role", role);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        var response = restTemplate.postForEntity("/api/auth/register", new HttpEntity<>(body, headers), String.class);
        assertEquals(201, response.getStatusCode().value(), response.getBody());
        return extract(response.getBody(), "token");
    }

    private String extract(String json, String field) {
        try {
            return objectMapper.readTree(json).get(field).asText();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private long extractLong(String json, String field) {
        try {
            return objectMapper.readTree(json).get(field).asLong();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private String authed(String token) {
        return "Bearer " + token;
    }

    private long createCourse(String instructorToken, String title) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", authed(instructorToken));
        Map<String, String> body = Map.of("title", title);
        var response = restTemplate.postForEntity("/api/courses", new HttpEntity<>(body, headers), String.class);
        assertEquals(201, response.getStatusCode().value(), response.getBody());
        return extractLong(response.getBody(), "id");
    }

    private void enroll(String studentToken, long courseId) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", authed(studentToken));
        var response = restTemplate.exchange("/api/courses/" + courseId + "/enroll", HttpMethod.POST,
                new HttpEntity<>(headers), String.class);
        assertEquals(201, response.getStatusCode().value(), response.getBody());
    }

    private long userIdOf(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", authed(token));
        var response = restTemplate.exchange("/api/dashboard", HttpMethod.GET, new HttpEntity<>(headers), String.class);
        assertEquals(200, response.getStatusCode().value());
        // dashboard doesn't carry the id; decode it straight out of the JWT instead.
        return extractLong(new String(java.util.Base64.getUrlDecoder().decode(token.split("\\.")[1])), "userId");
    }

    private String expiredToken(String email) {
        return Jwts.builder()
                .setSubject(email)
                .claim("userId", 1L)
                .claim("role", "STUDENT")
                .setIssuedAt(new Date(System.currentTimeMillis() - 120_000))
                .setExpiration(new Date(System.currentTimeMillis() - 60_000))
                .signWith(Keys.hmacShaKeyFor(TEST_JWT_SECRET.getBytes()), SignatureAlgorithm.HS256)
                .compact();
    }

    private WebSocketStompClient stompClient() {
        WebSocketStompClient client = new WebSocketStompClient(new StandardWebSocketClient());
        client.setMessageConverter(new MappingJackson2MessageConverter());
        return client;
    }

    /** Attempts a CONNECT; resolves the future on success, fails it on any transport/session error. */
    private CompletableFuture<StompSession> connect(WebSocketStompClient client, String bearerTokenOrNull) {
        CompletableFuture<StompSession> future = new CompletableFuture<>();
        StompHeaders connectHeaders = new StompHeaders();
        if (bearerTokenOrNull != null) {
            connectHeaders.add("Authorization", bearerTokenOrNull);
        }
        StompSessionHandler handler = new StompSessionHandlerAdapter() {
            @Override
            public void afterConnected(StompSession session, StompHeaders connectedHeaders) {
                future.complete(session);
            }

            @Override
            public void handleTransportError(StompSession session, Throwable exception) {
                future.completeExceptionally(exception);
            }

            @Override
            public void handleException(StompSession session, StompCommand command, StompHeaders headers,
                                         byte[] payload, Throwable exception) {
                future.completeExceptionally(exception);
            }
        };
        client.connectAsync(wsUrl(), (WebSocketHttpHeaders) null, connectHeaders, handler);
        return future;
    }

    private <T> BlockingQueue<T> subscribe(StompSession session, String destination, Class<T> type) {
        BlockingQueue<T> queue = new LinkedBlockingQueue<>();
        session.subscribe(destination, new StompFrameHandler() {
            @Override
            public Type getPayloadType(StompHeaders headers) {
                return type;
            }

            @SuppressWarnings("unchecked")
            @Override
            public void handleFrame(StompHeaders headers, Object payload) {
                queue.offer((T) payload);
            }
        });
        return queue;
    }

    @Test
    void validJwtConnectsSuccessfully() throws Exception {
        String token = register("WS Valid Student", "ws.valid.student@example.com", "password123", "STUDENT");
        StompSession session = connect(stompClient(), authed(token)).get(5, TimeUnit.SECONDS);
        assertTrue(session.isConnected());
        session.disconnect();
    }

    @Test
    void missingJwtIsRejected() {
        CompletableFuture<StompSession> future = connect(stompClient(), null);
        assertThrows(Exception.class, () -> future.get(3, TimeUnit.SECONDS));
    }

    @Test
    void invalidJwtIsRejected() {
        CompletableFuture<StompSession> future = connect(stompClient(), "Bearer not-a-real-jwt");
        assertThrows(Exception.class, () -> future.get(3, TimeUnit.SECONDS));
    }

    @Test
    void expiredJwtIsRejected() {
        String token = expiredToken("ws.expired@example.com");
        CompletableFuture<StompSession> future = connect(stompClient(), authed(token));
        assertThrows(Exception.class, () -> future.get(3, TimeUnit.SECONDS));
    }

    @Test
    void studentCanSubscribeToOwnPrivateQueues() throws Exception {
        String token = register("WS Sub Student", "ws.sub.student@example.com", "password123", "STUDENT");
        StompSession session = connect(stompClient(), authed(token)).get(5, TimeUnit.SECONDS);

        // Subscribing must not throw / must not tear down the session.
        subscribe(session, "/user/queue/notifications", String.class);
        subscribe(session, "/user/queue/messages", String.class);
        Thread.sleep(300);
        assertTrue(session.isConnected());
        session.disconnect();
    }

    @Test
    void studentCannotSendInstructorOnlyMessage() throws Exception {
        String instructorToken = register("WS Owner Instructor", "ws.owner.instructor@example.com", "password123", "INSTRUCTOR");
        String studentToken = register("WS Rogue Student", "ws.rogue.student@example.com", "password123", "STUDENT");
        long courseId = createCourse(instructorToken, "WS Course A");
        enroll(studentToken, courseId);
        long studentId = userIdOf(studentToken);

        StompSession session = connect(stompClient(), authed(studentToken)).get(5, TimeUnit.SECONDS);
        BlockingQueue<Map> errors = subscribe(session, "/user/queue/errors", Map.class);

        Map<String, Object> payload = Map.of("courseId", courseId, "studentId", studentId, "content", "I shouldn't be able to send this");
        session.send("/app/messages", payload);

        Map error = errors.poll(5, TimeUnit.SECONDS);
        assertNotNull(error, "student SEND to /app/messages should have been rejected with an error");
        session.disconnect();
    }

    @Test
    void instructorCanMessageEnrolledStudentOverWebSocket() throws Exception {
        String instructorToken = register("WS Good Instructor", "ws.good.instructor@example.com", "password123", "INSTRUCTOR");
        String studentToken = register("WS Good Student", "ws.good.student@example.com", "password123", "STUDENT");
        long courseId = createCourse(instructorToken, "WS Course B");
        enroll(studentToken, courseId);
        long studentId = userIdOf(studentToken);

        StompSession studentSession = connect(stompClient(), authed(studentToken)).get(5, TimeUnit.SECONDS);
        BlockingQueue<Map> messages = subscribe(studentSession, "/user/queue/messages", Map.class);

        StompSession instructorSession = connect(stompClient(), authed(instructorToken)).get(5, TimeUnit.SECONDS);
        Map<String, Object> payload = Map.of("courseId", courseId, "studentId", studentId, "content", "Welcome!");
        instructorSession.send("/app/messages", payload);

        Map received = messages.poll(5, TimeUnit.SECONDS);
        assertNotNull(received, "enrolled student should receive the message in real time");
        assertEquals("Welcome!", received.get("content"));

        studentSession.disconnect();
        instructorSession.disconnect();
    }

    @Test
    void instructorCannotMessageStudentNotEnrolledInThatCourse() throws Exception {
        String instructorToken = register("WS Strict Instructor", "ws.strict.instructor@example.com", "password123", "INSTRUCTOR");
        String outsiderToken = register("WS Outsider Student", "ws.outsider.student@example.com", "password123", "STUDENT");
        long courseId = createCourse(instructorToken, "WS Course C");
        long outsiderId = userIdOf(outsiderToken);
        // deliberately NOT enrolling the outsider

        StompSession outsiderSession = connect(stompClient(), authed(outsiderToken)).get(5, TimeUnit.SECONDS);
        BlockingQueue<Map> outsiderMessages = subscribe(outsiderSession, "/user/queue/messages", Map.class);

        StompSession instructorSession = connect(stompClient(), authed(instructorToken)).get(5, TimeUnit.SECONDS);
        BlockingQueue<Map> instructorErrors = subscribe(instructorSession, "/user/queue/errors", Map.class);
        Map<String, Object> payload = Map.of("courseId", courseId, "studentId", outsiderId, "content", "You shouldn't get this");
        instructorSession.send("/app/messages", payload);

        assertNotNull(instructorErrors.poll(5, TimeUnit.SECONDS), "instructor should get an error sending to a non-enrolled student");
        assertNull(outsiderMessages.poll(2, TimeUnit.SECONDS), "non-enrolled student must not receive the message");

        outsiderSession.disconnect();
        instructorSession.disconnect();
    }

    @Test
    void instructorCannotMessageThroughAnotherInstructorsCourse() throws Exception {
        String ownerToken = register("WS CourseOwner", "ws.courseowner@example.com", "password123", "INSTRUCTOR");
        String otherInstructorToken = register("WS OtherInstructor", "ws.otherinstructor@example.com", "password123", "INSTRUCTOR");
        String studentToken = register("WS Enrolled ForOwner", "ws.enrolled.forowner@example.com", "password123", "STUDENT");
        long courseId = createCourse(ownerToken, "WS Course D");
        enroll(studentToken, courseId);
        long studentId = userIdOf(studentToken);

        StompSession studentSession = connect(stompClient(), authed(studentToken)).get(5, TimeUnit.SECONDS);
        BlockingQueue<Map> studentMessages = subscribe(studentSession, "/user/queue/messages", Map.class);

        StompSession otherInstructorSession = connect(stompClient(), authed(otherInstructorToken)).get(5, TimeUnit.SECONDS);
        BlockingQueue<Map> errors = subscribe(otherInstructorSession, "/user/queue/errors", Map.class);
        Map<String, Object> payload = Map.of("courseId", courseId, "studentId", studentId, "content", "Not your course");
        otherInstructorSession.send("/app/messages", payload);

        assertNotNull(errors.poll(5, TimeUnit.SECONDS), "instructor must not message through a course they don't own");
        assertNull(studentMessages.poll(2, TimeUnit.SECONDS));

        studentSession.disconnect();
        otherInstructorSession.disconnect();
    }

    @Test
    void oneStudentNeverReceivesAnotherStudentsMessage() throws Exception {
        String instructorToken = register("WS Broadcast Instructor", "ws.broadcast.instructor@example.com", "password123", "INSTRUCTOR");
        String studentAToken = register("WS Student A", "ws.student.a@example.com", "password123", "STUDENT");
        String studentBToken = register("WS Student B", "ws.student.b@example.com", "password123", "STUDENT");
        long courseId = createCourse(instructorToken, "WS Course E");
        enroll(studentAToken, courseId);
        enroll(studentBToken, courseId);
        long studentAId = userIdOf(studentAToken);

        StompSession sessionA = connect(stompClient(), authed(studentAToken)).get(5, TimeUnit.SECONDS);
        BlockingQueue<Map> aMessages = subscribe(sessionA, "/user/queue/messages", Map.class);
        StompSession sessionB = connect(stompClient(), authed(studentBToken)).get(5, TimeUnit.SECONDS);
        BlockingQueue<Map> bMessages = subscribe(sessionB, "/user/queue/messages", Map.class);

        StompSession instructorSession = connect(stompClient(), authed(instructorToken)).get(5, TimeUnit.SECONDS);
        Map<String, Object> payload = Map.of("courseId", courseId, "studentId", studentAId, "content", "Only for A");
        instructorSession.send("/app/messages", payload);

        assertNotNull(aMessages.poll(5, TimeUnit.SECONDS), "student A should receive their own message");
        assertNull(bMessages.poll(2, TimeUnit.SECONDS), "student B must never receive student A's message");

        sessionA.disconnect();
        sessionB.disconnect();
        instructorSession.disconnect();
    }

    @Test
    void directSubscribeToRawBrokerQueueNeverReceivesAnotherUsersPrivateMessage() throws Exception {
        String instructorToken = register("WS Direct Instructor", "ws.direct.instructor@example.com", "password123", "INSTRUCTOR");
        String studentToken = register("WS Direct Student", "ws.direct.student@example.com", "password123", "STUDENT");
        long courseId = createCourse(instructorToken, "WS Course F");
        enroll(studentToken, courseId);
        long studentId = userIdOf(studentToken);

        StompSession attackerSession = connect(stompClient(), authed(register(
                "WS Attacker", "ws.attacker@example.com", "password123", "STUDENT"))).get(5, TimeUnit.SECONDS);
        // Attempt to bypass /user-scoped resolution entirely by subscribing straight to the
        // broker-level queue prefix - StompAuthChannelInterceptor should refuse this outright.
        BlockingQueue<Map> rawQueue = subscribe(attackerSession, "/queue/messages", Map.class);

        StompSession studentSession = connect(stompClient(), authed(studentToken)).get(5, TimeUnit.SECONDS);
        subscribe(studentSession, "/user/queue/messages", Map.class);

        StompSession instructorSession = connect(stompClient(), authed(instructorToken)).get(5, TimeUnit.SECONDS);
        instructorSession.send("/app/messages", Map.of("courseId", courseId, "studentId", studentId, "content", "Private"));

        assertNull(rawQueue.poll(3, TimeUnit.SECONDS), "raw /queue subscribe must never see another user's private message");

        // The rejected raw subscribe tears the attacker's connection down server-side - that IS
        // the expected security outcome, so its disconnect() here is best-effort, not asserted.
        safeDisconnect(attackerSession);
        studentSession.disconnect();
        instructorSession.disconnect();
    }

    private void safeDisconnect(StompSession session) {
        try {
            if (session.isConnected()) {
                session.disconnect();
            }
        } catch (Exception ignored) {
            // already torn down server-side - nothing left to clean up
        }
    }

    @Test
    void changingSenderIdInPayloadHasNoEffect() throws Exception {
        // MessageRequest has no senderId field at all - this proves it structurally, by sending
        // extra unknown JSON properties and confirming the message still resolves to whoever
        // actually authenticated the WebSocket session, not anything from the payload.
        String instructorToken = register("WS Sender Instructor", "ws.sender.instructor@example.com", "password123", "INSTRUCTOR");
        String impersonatedToken = register("WS Impersonated Instructor", "ws.impersonated.instructor@example.com", "password123", "INSTRUCTOR");
        String studentToken = register("WS Sender Student", "ws.sender.student@example.com", "password123", "STUDENT");
        long courseId = createCourse(instructorToken, "WS Course G");
        enroll(studentToken, courseId);
        long studentId = userIdOf(studentToken);
        long impersonatedId = userIdOf(impersonatedToken);

        StompSession studentSession = connect(stompClient(), authed(studentToken)).get(5, TimeUnit.SECONDS);
        BlockingQueue<Map> messages = subscribe(studentSession, "/user/queue/messages", Map.class);

        StompSession instructorSession = connect(stompClient(), authed(instructorToken)).get(5, TimeUnit.SECONDS);
        Map<String, Object> payload = new HashMap<>();
        payload.put("courseId", courseId);
        payload.put("studentId", studentId);
        payload.put("content", "Real sender check");
        payload.put("senderId", impersonatedId); // not a real field on MessageRequest - must be ignored
        instructorSession.send("/app/messages", payload);

        Map received = messages.poll(5, TimeUnit.SECONDS);
        assertNotNull(received);
        assertEquals("WS Sender Instructor", received.get("senderName"),
                "sender must come from the authenticated session, never the payload");

        studentSession.disconnect();
        instructorSession.disconnect();
    }

    @Test
    void heartbeatIsNegotiatedAtFifteenSeconds() throws Exception {
        String token = register("WS Heartbeat Student", "ws.heartbeat.student@example.com", "password123", "STUDENT");
        CompletableFuture<StompHeaders> connectedHeadersFuture = new CompletableFuture<>();
        WebSocketStompClient client = stompClient();
        StompHeaders connectHeaders = new StompHeaders();
        connectHeaders.add("Authorization", authed(token));
        client.connectAsync(wsUrl(), (WebSocketHttpHeaders) null, connectHeaders, new StompSessionHandlerAdapter() {
            @Override
            public void afterConnected(StompSession session, StompHeaders connectedHeaders) {
                connectedHeadersFuture.complete(connectedHeaders);
            }
        });

        StompHeaders headers = connectedHeadersFuture.get(5, TimeUnit.SECONDS);
        assertNotNull(headers.getFirst("heart-beat"));
        assertTrue(headers.getFirst("heart-beat").contains("15000"),
                "expected a 15s heartbeat, got: " + headers.getFirst("heart-beat"));
    }

    @Test
    void disconnectIsHandledCleanly() throws Exception {
        String token = register("WS Disconnect Student", "ws.disconnect.student@example.com", "password123", "STUDENT");
        StompSession session = connect(stompClient(), authed(token)).get(5, TimeUnit.SECONDS);
        assertTrue(session.isConnected());
        session.disconnect();
        Thread.sleep(200);
        assertFalse(session.isConnected());
    }
}
