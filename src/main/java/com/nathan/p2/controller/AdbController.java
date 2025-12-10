package com.nathan.p2.controller;

import com.nathan.p2.service.AdbClusteringService;
import com.nathan.p2.service.AdbDeviceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.List;

/**
 * ADB Live Drive Test Controller
 * Provides real-time cellular data and clustering from connected Android devices
 */
@Slf4j
@RestController
@RequestMapping("/api/adb")
@RequiredArgsConstructor
@Tag(name = "ADB Live Drive Test", description = "Real-time data collection from Android devices via ADB")
public class AdbController {

    private final AdbDeviceService adbService;
    private final AdbClusteringService clusteringService;

    @GetMapping("/devices")
    @Operation(summary = "Get list of connected Android devices")
    public ResponseEntity<List<String>> getDevices() {
        log.info("Fetching connected ADB devices");
        List<String> devices = adbService.getConnectedDevices();
        return ResponseEntity.ok(devices);
    }

    @GetMapping("/devices/{deviceId}/cellular")
    @Operation(summary = "Get current cellular data from device")
    public Mono<ResponseEntity<AdbDeviceService.CellularData>> getCellularData(
            @PathVariable String deviceId) {
        log.info("Getting cellular data from device: {}", deviceId);
        return Mono.fromCallable(() -> adbService.getCellularData(deviceId))
                .map(ResponseEntity::ok)
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }

    @GetMapping("/devices/{deviceId}/gps")
    @Operation(summary = "Get current GPS location from device")
    public Mono<ResponseEntity<AdbDeviceService.GpsData>> getGpsData(
            @PathVariable String deviceId) {
        log.info("Getting GPS data from device: {}", deviceId);
        return Mono.fromCallable(() -> adbService.getGpsData(deviceId))
                .map(ResponseEntity::ok)
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }

    @GetMapping("/devices/{deviceId}/sample")
    @Operation(summary = "Get complete device sample (cellular + GPS)")
    public Mono<ResponseEntity<AdbDeviceService.DeviceSample>> getDeviceSample(
            @PathVariable String deviceId) {
        log.info("Getting device sample from: {}", deviceId);
        return Mono.fromCallable(() -> adbService.getDeviceSample(deviceId))
                .map(ResponseEntity::ok)
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }

    @GetMapping(value = "/devices/{deviceId}/stream/clusters",
                produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "Stream real-time cluster updates from device")
    public Flux<ServerSentEvent<AdbClusteringService.ClusterUpdate>> streamClusters(
            @PathVariable String deviceId,
            @RequestParam(defaultValue = "4") int numClusters,
            @RequestParam(defaultValue = "3") int intervalSeconds) {

        log.info("Starting cluster stream for device {} with {} clusters", deviceId, numClusters);

        return clusteringService.streamClusterUpdates(
                deviceId,
                numClusters,
                Duration.ofSeconds(intervalSeconds)
        )
        .map(update -> ServerSentEvent.<AdbClusteringService.ClusterUpdate>builder()
                .id(update.getUpdateId())
                .event("cluster-update")
                .data(update)
                .build())
        .doOnNext(event -> log.debug("Emitting cluster update: {}", event.id()))
        .doOnError(e -> log.error("Error in cluster stream: {}", e.getMessage()))
        .doOnComplete(() -> log.info("Cluster stream completed for device: {}", deviceId));
    }

    @GetMapping(value = "/devices/{deviceId}/stream/cellular",
                produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "Stream real-time cellular data from device")
    public Flux<ServerSentEvent<AdbDeviceService.CellularData>> streamCellularData(
            @PathVariable String deviceId,
            @RequestParam(defaultValue = "1") int intervalSeconds) {

        log.info("Starting cellular data stream for device {}", deviceId);

        return Flux.interval(Duration.ofSeconds(intervalSeconds))
                .flatMap(tick -> Mono.fromCallable(() -> adbService.getCellularData(deviceId)))
                .filter(data -> data != null)
                .map(data -> ServerSentEvent.<AdbDeviceService.CellularData>builder()
                        .id(String.valueOf(data.getTimestamp()))
                        .event("cellular-data")
                        .data(data)
                        .build())
                .doOnError(e -> log.error("Error in cellular stream: {}", e.getMessage()));
    }

    @GetMapping(value = "/devices/{deviceId}/stream/gps",
                produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "Stream real-time GPS data from device")
    public Flux<ServerSentEvent<AdbDeviceService.GpsData>> streamGpsData(
            @PathVariable String deviceId,
            @RequestParam(defaultValue = "1") int intervalSeconds) {

        log.info("Starting GPS stream for device {}", deviceId);

        return Flux.interval(Duration.ofSeconds(intervalSeconds))
                .flatMap(tick -> Mono.fromCallable(() -> adbService.getGpsData(deviceId)))
                .filter(data -> data != null && data.getLatitude() != null)
                .map(data -> ServerSentEvent.<AdbDeviceService.GpsData>builder()
                        .id(String.valueOf(data.getTimestamp()))
                        .event("gps-data")
                        .data(data)
                        .build())
                .doOnError(e -> log.error("Error in GPS stream: {}", e.getMessage()));
    }
}

