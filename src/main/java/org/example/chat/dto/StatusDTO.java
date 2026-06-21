package org.example.chat.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StatusDTO {
    private Long id;
    private Long userId;
    private String content;
    private String mediaUrl;
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;
}
