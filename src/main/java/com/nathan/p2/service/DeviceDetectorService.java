package com.nathan.p2.service;

import com.nathan.p2.config.ToolsConfig;
import com.nathan.p2.util.PlatformUtils;
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
    private final AdbAutoInstallerService adbInstaller;

    public Flux<DeviceEvent> detectDevices() {
        return Flux.interval(toolsConfig.getDevice().getDetectionInterval())
                .flatMap(tick -> getConnectedDeviceIds())
                .distinctUntilChanged()
                .flatMap(this::createDeviceEvents);
    }

    private Mono<List<String>> getConnectedDeviceIds() {
        return Mono.fromCallable(() -> {
            List<String> devices = new ArrayList<>();
            try {
                String adbPath = toolsConfig.getTools().getAdb().getPath();
                if (adbPath == null || adbPath.isEmpty()) {
                    adbPath = "adb";
                }
                Process process = new ProcessBuilder(adbPath, "devices").start();

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
                String adbPath = toolsConfig.getTools().getAdb().getPath();
                if (adbPath == null || adbPath.isEmpty()) {
                    adbPath = "adb";
                }
                Process process = new ProcessBuilder(
                        adbPath,
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
                String adbPath = toolsConfig.getTools().getAdb().getPath();
                if (adbPath == null || adbPath.isEmpty()) {
                    adbPath = "adb";
                }
                Process process = new ProcessBuilder(
                        adbPath,
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

    /**
     * Get all currently connected devices with full information.
     * @return Flux of DeviceDto objects
     */
    public Flux<com.nathan.p2.dto.DeviceDto> getConnectedDevices() {
        return getConnectedDeviceIds()
                .flatMapMany(Flux::fromIterable)
                .flatMap(deviceId -> 
                    Mono.zip(
                        Mono.just(deviceId),
                        getDeviceModel(deviceId),
                        getDeviceFirmware(deviceId),
                        getDeviceManufacturer(deviceId)
                    )
                    .map(tuple -> com.nathan.p2.dto.DeviceDto.builder()
                            .deviceId(tuple.getT1())
                            .model(tuple.getT2())
                            .firmware(tuple.getT3())
                            .manufacturer(tuple.getT4())
                            .status("CONNECTED")
                            .connected(true)
                            .chipset(detectChipset(tuple.getT4()))
                            .build())
                );
    }

    private Mono<String> getDeviceManufacturer(String deviceId) {
        return Mono.fromCallable(() -> {
            try {
                String adbPath = toolsConfig.getTools().getAdb().getPath();
                if (adbPath == null || adbPath.isEmpty()) {
                    adbPath = "adb";
                }
                Process process = new ProcessBuilder(
                        adbPath,
                        "-s", deviceId, "shell", "getprop", "ro.product.manufacturer")
                        .start();

                BufferedReader reader = new BufferedReader(
                        new InputStreamReader(process.getInputStream()));
                String manufacturer = reader.readLine();
                process.waitFor();
                return manufacturer != null ? manufacturer.trim() : "Unknown";
            } catch (Exception e) {
                log.error("Error getting device manufacturer", e);
                return "Unknown";
            }
        });
    }

    private String detectChipset(String manufacturer) {
        return switch (manufacturer.toLowerCase()) {
            case "samsung" -> "Samsung Exynos";
            case "xiaomi", "oppo", "vivo", "oneplus" -> "Qualcomm Snapdragon";
            case "huawei", "honor" -> "HiSilicon Kirin";
            default -> "Unknown";
        };
    }
}
