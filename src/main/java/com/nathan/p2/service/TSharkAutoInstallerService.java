package com.nathan.p2.service;

import com.nathan.p2.util.PlatformUtils;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.io.*;
import java.net.URL;
import java.nio.channels.Channels;
import java.nio.channels.ReadableByteChannel;
import java.nio.file.*;

@Slf4j
@Service
public class TSharkAutoInstallerService {

    private static final String WIRESHARK_WINDOWS_URL = "https://2.na.dl.wireshark.org/win64/Wireshark-4.2.2-x64.exe";

    public Mono<TSharkStatus> checkAndInstallTShark() {
        return Mono.fromCallable(() -> {
            TSharkStatus status = new TSharkStatus();
            
            if (isTSharkInPath()) {
                status.setInstalled(true);
                status.setInPath(true);
                status.setVersion(getTSharkVersion());
                status.setPath(findTSharkInPath());
                log.info("TShark found in system PATH: {}", status.getPath());
                return status;
            }

            Path localTShark = getLocalTSharkPath();
            if (Files.exists(localTShark)) {
                status.setInstalled(true);
                status.setInPath(false);
                status.setPath(localTShark.toString());
                status.setVersion(getTSharkVersion(localTShark));
                log.info("TShark found in local installation: {}", status.getPath());
                return status;
            }

            log.info("TShark not found. Starting automatic installation...");
            
            try {
                installTShark();
                
                status.setInstalled(true);
                status.setInPath(false);
                status.setPath(getLocalTSharkPath().toString());
                status.setVersion(getTSharkVersion(getLocalTSharkPath()));
                status.setAutoInstalled(true);
                status.setMessage("TShark successfully installed automatically");
                
                log.info("TShark installation completed successfully!");
                
            } catch (Exception e) {
                log.error("Failed to install TShark automatically: {}", e.getMessage());
                status.setInstalled(false);
                status.setMessage("Failed to install TShark: " + e.getMessage());
            }
            
            return status;
        });
    }

    private boolean isTSharkInPath() {
        try {
            Process process = new ProcessBuilder("tshark", "--version")
                    .redirectErrorStream(true)
                    .start();
            return process.waitFor() == 0;
        } catch (Exception e) {
            return false;
        }
    }

    private String findTSharkInPath() {
        try {
            String command = PlatformUtils.isWindows() ? "where tshark" : "which tshark";
            Process process = Runtime.getRuntime().exec(command);
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                return reader.readLine();
            }
        } catch (Exception e) {
            return "tshark";
        }
    }

    private String getTSharkVersion() {
        return getTSharkVersion(null);
    }

    private String getTSharkVersion(Path tsharkPath) {
        try {
            String cmd = tsharkPath != null ? tsharkPath.toString() : "tshark";
            Process process = new ProcessBuilder(cmd, "--version")
                    .redirectErrorStream(true)
                    .start();
            
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line = reader.readLine();
                if (line != null && line.contains("TShark")) {
                    return line.trim();
                }
            }
        } catch (Exception e) {
            log.warn("Failed to get TShark version: {}", e.getMessage());
        }
        return "unknown";
    }

    private void installTShark() throws IOException {
        if (!PlatformUtils.isWindows()) {
            throw new IOException("Automatic TShark installation only supported on Windows. Please install Wireshark manually.");
        }

        log.info("Starting TShark/Wireshark installation for Windows");
        
        Path installDir = getInstallDirectory();
        Files.createDirectories(installDir);
        
        Path installerFile = installDir.resolve("wireshark-installer.exe");
        log.info("Downloading Wireshark from: {}", WIRESHARK_WINDOWS_URL);
        downloadFile(WIRESHARK_WINDOWS_URL, installerFile);
        
        log.info("Running Wireshark installer (silent mode)...");
        ProcessBuilder pb = new ProcessBuilder(
            installerFile.toString(),
            "/S",  // Silent install
            "/desktopicon=no",
            "/quicklaunchicon=no"
        );
        Process process = pb.start();
        int exitCode;
        try {
            exitCode = process.waitFor();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("Wireshark installation interrupted", e);
        }
        log.info("Wireshark/TShark installation completed");
    }

    private Path getInstallDirectory() {
        String userHome = System.getProperty("user.home");
        return Paths.get(userHome, ".eca", "tools");
    }

    private Path getLocalTSharkPath() {
        // Check bundled tools first
        String tsharkName = PlatformUtils.isWindows() ? "tshark.exe" : "tshark";
        Path bundled = Paths.get("tools", "tshark", tsharkName);
        if (Files.exists(bundled)) {
            log.info("Using bundled TShark: {}", bundled);
            return bundled;
        }
        
        if (PlatformUtils.isWindows()) {
            Path programFiles = Paths.get("C:", "Program Files", "Wireshark", "tshark.exe");
            if (Files.exists(programFiles)) {
                return programFiles;
            }
        }
        return getInstallDirectory().resolve("tshark");
    }

    private void downloadFile(String urlStr, Path destination) throws IOException {
        log.info("Downloading Wireshark installer...");
        URL url = new URL(urlStr);
        
        try (ReadableByteChannel rbc = Channels.newChannel(url.openStream());
             FileOutputStream fos = new FileOutputStream(destination.toFile())) {
            
            long bytesTransferred = fos.getChannel().transferFrom(rbc, 0, Long.MAX_VALUE);
            log.info("Downloaded {} MB", bytesTransferred / (1024 * 1024));
        }
    }

    public String getTSharkExecutablePath() {
        if (isTSharkInPath()) {
            return findTSharkInPath();
        }
        Path localTShark = getLocalTSharkPath();
        return Files.exists(localTShark) ? localTShark.toString() : "tshark";
    }

    @Data
    public static class TSharkStatus {
        private boolean installed;
        private boolean inPath;
        private boolean autoInstalled;
        private String path;
        private String version;
        private String message;
    }
}
