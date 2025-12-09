package com.nathan.p2.config;

import com.nathan.p2.service.AdbAutoInstallerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class ApplicationStartupListener {

    private final AdbAutoInstallerService adbInstaller;

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        log.info("=".repeat(60));
        log.info("ECA Application Started - Performing automatic setup...");
        log.info("=".repeat(60));
        
        // Automatically check and install ADB
        adbInstaller.checkAndInstallAdb()
                .doOnSuccess(status -> {
                    log.info("");
                    log.info("ADB Setup Complete:");
                    log.info("  - Installed: {}", status.isInstalled());
                    log.info("  - In PATH: {}", status.isInPath());
                    log.info("  - Version: {}", status.getVersion());
                    log.info("  - Path: {}", status.getPath());
                    if (status.isAutoInstalled()) {
                        log.info("  - Auto-installed by ECA");
                    }
                    log.info("");
                    log.info("ECA is ready for device connections!");
                    log.info("=".repeat(60));
                })
                .doOnError(error -> {
                    log.error("");
                    log.error("Failed to setup ADB: {}", error.getMessage());
                    log.error("Device detection may not work properly.");
                    log.error("Please install ADB manually or check logs.");
                    log.error("=".repeat(60));
                })
                .subscribe();
    }
}
