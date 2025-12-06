package com.nathan.p2.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("sessions")
public class Session {
    @Id
    private Long id;
    private String deviceId;
    private String deviceModel;
    private String firmware;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private SessionStatus status;
    private String sessionDir;
}
