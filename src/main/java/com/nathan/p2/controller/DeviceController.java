package com.nathan.p2.controller;

import com.nathan.p2.dto.DeviceDto;
import com.nathan.p2.service.DeviceDetectorService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

@Slf4j
@RestController
@RequestMapping("/api/devices")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Tag(name = "Device Management", description = "APIs for detecting and managing connected Android devices via ADB. Devices must have USB debugging enabled and be authorized for ADB access.")
public class DeviceController {
    
    private final DeviceDetectorService deviceDetectorService;

    @Operation(
        summary = "List all connected devices",
        description = "Returns a list of all Android devices currently connected via ADB. Each device includes its serial number, model, manufacturer, Android version, and connection status. The system automatically detects devices every 3 seconds."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Devices retrieved successfully (may be empty if no devices connected)",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = DeviceDto.class)
            )
        ),
        @ApiResponse(
            responseCode = "500",
            description = "ADB command failed or internal error",
            content = @Content(mediaType = "application/json")
        )
    })
    @GetMapping
    public Flux<DeviceDto> getDevices() {
        log.debug("Fetching all connected devices");
        return deviceDetectorService.getConnectedDevices();
    }

    @Operation(
        summary = "Get specific device by ID",
        description = "Returns detailed information about a specific device identified by its serial number or device ID. The device must be currently connected and detected by ADB."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Device found and returned (empty if device not connected)",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = DeviceDto.class)
            )
        ),
        @ApiResponse(
            responseCode = "404",
            description = "Device not found or not connected",
            content = @Content(mediaType = "application/json")
        )
    })
    @GetMapping("/{deviceId}")
    public Flux<DeviceDto> getDevice(
        @Parameter(description = "Device serial number or ID from ADB", required = true, example = "RF8N41JBXXX")
        @PathVariable String deviceId
    ) {
        log.debug("Fetching device: {}", deviceId);
        return deviceDetectorService.getConnectedDevices()
                .filter(device -> device.getDeviceId().equals(deviceId));
    }
}
