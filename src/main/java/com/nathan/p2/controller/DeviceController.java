package com.nathan.p2.controller;

import com.nathan.p2.dto.DeviceDto;
import com.nathan.p2.service.DeviceDetectorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

/**
 * REST controller for device management operations.
 * Provides endpoints for device detection and status monitoring.
 */
@Slf4j
@RestController
@RequestMapping("/api/devices")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DeviceController {
    
    private final DeviceDetectorService deviceDetectorService;

    /**
     * Get all currently connected devices.
     * @return Flux of connected devices with their status
     */
    @GetMapping
    public Flux<DeviceDto> getDevices() {
        log.debug("Fetching all connected devices");
        return deviceDetectorService.getConnectedDevices();
    }

    /**
     * Get specific device by ID.
     * @param deviceId Device identifier
     * @return Device information
     */
    @GetMapping("/{deviceId}")
    public Flux<DeviceDto> getDevice(@PathVariable String deviceId) {
        log.debug("Fetching device: {}", deviceId);
        return deviceDetectorService.getConnectedDevices()
                .filter(device -> device.getDeviceId().equals(deviceId));
    }
}
