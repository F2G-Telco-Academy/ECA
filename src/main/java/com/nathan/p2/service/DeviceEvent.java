package com.nathan.p2.service;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DeviceEvent {
    private String deviceId;
    private DeviceEventType eventType;
    private String deviceModel;
    private String firmware;
}
