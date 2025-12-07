package com.nathan.p2.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Data Transfer Object for device information.
 * Represents a connected mobile device with its properties.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeviceDto {
    private String deviceId;
    private String model;
    private String manufacturer;
    private String firmware;
    private String chipset;
    private String status;
    private Boolean connected;
    private Long currentSessionId;
}
