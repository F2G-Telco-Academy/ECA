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
@Table("artifacts")
public class Artifact {
    @Id
    private Long id;
    private Long sessionId;
    private ArtifactType type;
    private String path;
    private Long size;
    private LocalDateTime createdAt;
}
