package com.lms.platform.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CourseRequest {

    @NotBlank(message = "title is required")
    @Size(max = 200)
    private String title;

    @Size(max = 2000)
    private String description;
}
