package com.nathan.p2.service;

import com.nathan.p2.config.ToolsConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class DeviceDetectorService {
    
    private final ToolsConfig toolsConfig;

    public Flux<DeviceEvent> detectDevices() {
        return Flux.interval(toolsConfig.getDevice().getDetectionInterval())
                .flatMap(tick -> getConnectedDevices())
                .distinctUntilChanged()
                .flatMap(this::createDeviceEvents);
    }

    private Mono<List<String>> getConnectedDevices() {
        return Mono.fromCallable(() -> {
            List<String> devices = new ArrayList<>();
            try {
                Process process = new ProcessBuilder(
                        toolsConfig.getTools().getAdb().getPath(), "devices")
                        .start();

                BufferedReader reader = new BufferedReader(
                        new InputStreamReader(process.getInputStream()));

                String line;
                while ((line = reader.readLine()) != null) {
                    if (line.contains("\tdevice")) {
                        String deviceId = line.split("\t")[0];
                        devices.add(deviceId);
                    }
                }
                process.waitFor();
            } catch (Exception e) {
                log.error("Error detecting devices", e);
            }
            return devices;
        });
    }

    private Flux<DeviceEvent> createDeviceEvents(List<String> devices) {
        return Flux.fromIterable(devices)
                .map(deviceId -> DeviceEvent.builder()
                        .deviceId(deviceId)
                        .eventType(DeviceEventType.CONNECTED)
                        .build());
    }

    public Mono<String> getDeviceModel(String deviceId) {
        return Mono.fromCallable(() -> {
            try {
                Process process = new ProcessBuilder(
                        toolsConfig.getTools().getAdb().getPath(),
                        "-s", deviceId, "shell", "getprop", "ro.product.model")
                        .start();

                BufferedReader reader = new BufferedReader(
                        new InputStreamReader(process.getInputStream()));
                String model = reader.readLine();
                process.waitFor();
                return model != null ? model.trim() : "Unknown";
            } catch (Exception e) {
                log.error("Error getting device model", e);
                return "Unknown";
            }
        });
    }

    public Mono<String> getDeviceFirmware(String deviceId) {
        return Mono.fromCallable(() -> {
            try {
                Process process = new ProcessBuilder(
                        toolsConfig.getTools().getAdb().getPath(),
                        "-s", deviceId, "shell", "getprop", "ro.build.version.release")
                        .start();

                BufferedReader reader = new BufferedReader(
                        new InputStreamReader(process.getInputStream()));
                String firmware = reader.readLine();
                process.waitFor();
                return firmware != null ? firmware.trim() : "Unknown";
            } catch (Exception e) {
                log.error("Error getting device firmware", e);
                return "Unknown";
            }
        });
    }
}
