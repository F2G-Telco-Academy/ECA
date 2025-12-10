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
public class PythonAutoInstallerService {

    private static final String PYTHON_WINDOWS_URL = "https://www.python.org/ftp/python/3.11.7/python-3.11.7-amd64.exe";

    public Mono<PythonStatus> checkAndInstallPython() {
        return Mono.fromCallable(() -> {
            PythonStatus status = new PythonStatus();
            
            if (isPythonInPath()) {
                status.setInstalled(true);
                status.setInPath(true);
                status.setVersion(getPythonVersion());
                status.setPath(findPythonInPath());
                log.info("Python found in system PATH: {}", status.getPath());
                return status;
            }

            log.info("Python not found. Starting automatic installation...");
            
            try {
                installPython();
                
                status.setInstalled(true);
                status.setInPath(true);
                status.setVersion(getPythonVersion());
                status.setAutoInstalled(true);
                status.setMessage("Python successfully installed automatically");
                
                log.info("Python installation completed successfully!");
                
            } catch (Exception e) {
                log.error("Failed to install Python automatically: {}", e.getMessage());
                status.setInstalled(false);
                status.setMessage("Failed to install Python: " + e.getMessage());
            }
            
            return status;
        });
    }

    private boolean isPythonInPath() {
        try {
            Process process = new ProcessBuilder("python", "--version")
                    .redirectErrorStream(true)
                    .start();
            return process.waitFor() == 0;
        } catch (Exception e) {
            return false;
        }
    }

    private String findPythonInPath() {
        try {
            String command = PlatformUtils.isWindows() ? "where python" : "which python";
            Process process = Runtime.getRuntime().exec(command);
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                return reader.readLine();
            }
        } catch (Exception e) {
            return "python";
        }
    }

    private String getPythonVersion() {
        try {
            Process process = new ProcessBuilder("python", "--version")
                    .redirectErrorStream(true)
                    .start();
            
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line = reader.readLine();
                if (line != null) {
                    return line.trim();
                }
            }
        } catch (Exception e) {
            log.warn("Failed to get Python version: {}", e.getMessage());
        }
        return "unknown";
    }

    private void installPython() throws IOException {
        if (!PlatformUtils.isWindows()) {
            throw new IOException("Automatic Python installation only supported on Windows. Please install Python manually.");
        }

        log.info("Starting Python installation for Windows");
        
        Path installDir = getInstallDirectory();
        Files.createDirectories(installDir);
        
        Path installerFile = installDir.resolve("python-installer.exe");
        log.info("Downloading Python from: {}", PYTHON_WINDOWS_URL);
        downloadFile(PYTHON_WINDOWS_URL, installerFile);
        
        log.info("Running Python installer (silent mode)...");
        ProcessBuilder pb = new ProcessBuilder(
            installerFile.toString(),
            "/quiet",
            "InstallAllUsers=1",
            "PrependPath=1",
            "Include_pip=1"
        );
        Process process = pb.start();
        int exitCode;
        try {
            exitCode = process.waitFor();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("Python installation interrupted", e);
        }
        log.info("Installing SCAT Python dependencies...");
        installScatDependencies();
        
        Files.deleteIfExists(installerFile);
        log.info("Python installation completed");
    }

    private void installScatDependencies() {
        try {
            Path requirementsFile = Paths.get("scat", "requirements.txt");
            if (Files.exists(requirementsFile)) {
                ProcessBuilder pb = new ProcessBuilder(
                    "python", "-m", "pip", "install", "-r", requirementsFile.toString()
                );
                Process process = pb.start();
                process.waitFor();
                log.info("SCAT dependencies installed");
            }
        } catch (Exception e) {
            log.warn("Failed to install SCAT dependencies: {}", e.getMessage());
        }
    }

    private Path getInstallDirectory() {
        String userHome = System.getProperty("user.home");
        return Paths.get(userHome, ".eca", "tools");
    }

    private void downloadFile(String urlStr, Path destination) throws IOException {
        log.info("Downloading Python installer...");
        URL url = new URL(urlStr);
        
        try (ReadableByteChannel rbc = Channels.newChannel(url.openStream());
             FileOutputStream fos = new FileOutputStream(destination.toFile())) {
            
            long bytesTransferred = fos.getChannel().transferFrom(rbc, 0, Long.MAX_VALUE);
            log.info("Downloaded {} MB", bytesTransferred / (1024 * 1024));
        }
    }

    @Data
    public static class PythonStatus {
        private boolean installed;
        private boolean inPath;
        private boolean autoInstalled;
        private String path;
        private String version;
        private String message;
    }
}
