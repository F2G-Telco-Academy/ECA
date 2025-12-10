package com.nathan.p2.dto;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SignalingMessageDto {
    private String timestamp;
    private String channel;
    private String direction; // UL or DL
    private String protocol;
    private String messageType;
    private JsonNode details;
}
