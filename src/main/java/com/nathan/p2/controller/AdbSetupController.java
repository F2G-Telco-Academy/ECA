package com.nathan.p2.controller;

import com.nathan.p2.service.AdbAutoInstallerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

@Slf4j
@RestController
@RequestMapping("/api/adb")
@RequiredArgsConstructor
@Tag(name = "ADB Setup", description = "ADB installation and configuration APIs")
public class AdbSetupController {

    private final AdbAutoInstallerService adbInstaller;

    @GetMapping(value = "/status", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Check ADB installation status")
    public Mono<AdbAutoInstallerService.AdbStatus> getAdbStatus() {
        log.info("Checking ADB status");
        return adbInstaller.checkAndInstallAdb()
                .doOnSuccess(status -> log.info("ADB status: installed={}, inPath={}, version={}",
                        status.isInstalled(), status.isInPath(), status.getVersion()))
                .doOnError(e -> log.error("Failed to check ADB status", e));
    }

    @PostMapping(value = "/install", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Force ADB installation")
    public Mono<AdbAutoInstallerService.AdbStatus> installAdb() {
        log.info("Force installing ADB");
        return adbInstaller.checkAndInstallAdb()
                .doOnSuccess(status -> log.info("ADB installation completed"))
                .doOnError(e -> log.error("Failed to install ADB", e));
    }

    @GetMapping(value = "/path", produces = MediaType.TEXT_PLAIN_VALUE)
    @Operation(summary = "Get ADB executable path")
    public Mono<String> getAdbPath() {
        return Mono.fromCallable(() -> adbInstaller.getAdbExecutablePath());
    }
}
