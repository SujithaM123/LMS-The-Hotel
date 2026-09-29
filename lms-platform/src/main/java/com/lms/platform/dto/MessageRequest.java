package com.lms.platform.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MessageRequest {

    @NotNull(message = "studentId is required")
    private Long studentId;

    @NotNull(message = "courseId is required")
    private Long courseId;

    @NotBlank(message = "content is required")
    @Size(max = 2000)
    private String content;
}
