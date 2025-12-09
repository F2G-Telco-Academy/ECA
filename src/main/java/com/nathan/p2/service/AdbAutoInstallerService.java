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
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Slf4j
@Service
public class AdbAutoInstallerService {

    private static final String WINDOWS_ADB_URL = "https://dl.google.com/android/repository/platform-tools-latest-windows.zip";
    private static final String LINUX_ADB_URL = "https://dl.google.com/android/repository/platform-tools-latest-linux.zip";
    private static final String MAC_ADB_URL = "https://dl.google.com/android/repository/platform-tools-latest-darwin.zip";
    
    private Path adbInstallPath;
    private Path adbExecutable;

    public Mono<AdbStatus> checkAndInstallAdb() {
        return Mono.fromCallable(() -> {
            AdbStatus status = new AdbStatus();
            
            // Check if ADB is already in PATH
            if (isAdbInPath()) {
                status.setInstalled(true);
                status.setInPath(true);
                status.setVersion(getAdbVersion());
                status.setPath(findAdbInPath());
                log.info("ADB found in system PATH: {}", status.getPath());
                return status;
            }

            // Check if ADB is in application directory
            Path localAdb = getLocalAdbPath();
            if (Files.exists(localAdb)) {
                status.setInstalled(true);
                status.setInPath(false);
                status.setPath(localAdb.toString());
                status.setVersion(getAdbVersion(localAdb));
                log.info("ADB found in local installation: {}", status.getPath());
                return status;
            }

            // ADB not found, install it automatically
            log.info("ADB not found. Starting automatic installation...");
            log.info("This is a one-time setup and may take a few moments.");
            
            try {
                installAdb();
                
                status.setInstalled(true);
                status.setInPath(false);
                status.setPath(getLocalAdbPath().toString());
                status.setVersion(getAdbVersion(getLocalAdbPath()));
                status.setAutoInstalled(true);
                status.setMessage("ADB successfully installed automatically");
                
                log.info("ADB installation completed successfully!");
                
            } catch (Exception e) {
                log.error("Failed to install ADB automatically: {}", e.getMessage());
                status.setInstalled(false);
                status.setMessage("Failed to install ADB: " + e.getMessage());
            }
            
            return status;
        });
    }

    private boolean isAdbInPath() {
        try {
            Process process = new ProcessBuilder(getAdbCommand(), "version")
                    .redirectErrorStream(true)
                    .start();
            int exitCode = process.waitFor();
            return exitCode == 0;
        } catch (Exception e) {
            return false;
        }
    }

    private String findAdbInPath() {
        try {
            String command = PlatformUtils.isWindows() ? "where adb" : "which adb";
            Process process = Runtime.getRuntime().exec(command);
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                return reader.readLine();
            }
        } catch (Exception e) {
            return "adb";
        }
    }

    private String getAdbVersion() {
        return getAdbVersion(null);
    }

    private String getAdbVersion(Path adbPath) {
        try {
            String adbCmd = adbPath != null ? adbPath.toString() : getAdbCommand();
            Process process = new ProcessBuilder(adbCmd, "version")
                    .redirectErrorStream(true)
                    .start();
            
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line = reader.readLine();
                if (line != null && line.contains("Android Debug Bridge version")) {
                    return line.substring(line.indexOf("version") + 8).trim();
                }
            }
        } catch (Exception e) {
            log.warn("Failed to get ADB version: {}", e.getMessage());
        }
        return "unknown";
    }

    private void installAdb() throws IOException {
        String osName = System.getProperty("os.name");
        log.info("Starting ADB installation for {}", osName);
        
        // Determine download URL based on OS
        String downloadUrl = getDownloadUrl();
        
        // Create installation directory
        adbInstallPath = getInstallDirectory();
        Files.createDirectories(adbInstallPath);
        
        // Download ADB platform tools
        Path zipFile = adbInstallPath.resolve("platform-tools.zip");
        log.info("Downloading ADB from: {}", downloadUrl);
        downloadFile(downloadUrl, zipFile);
        
        // Extract ZIP
        log.info("Extracting ADB to: {}", adbInstallPath);
        extractZip(zipFile, adbInstallPath);
        
        // Set executable permissions on Linux/Mac
        if (!PlatformUtils.isWindows()) {
            Path adbExe = getLocalAdbPath();
            if (Files.exists(adbExe)) {
                adbExe.toFile().setExecutable(true);
            }
        }
        
        // Clean up ZIP file
        Files.deleteIfExists(zipFile);
        
        log.info("ADB installation completed successfully");
    }

    private String getDownloadUrl() {
        if (PlatformUtils.isWindows()) {
            return WINDOWS_ADB_URL;
        } else if (PlatformUtils.isMac()) {
            return MAC_ADB_URL;
        } else {
            return LINUX_ADB_URL;
        }
    }

    private Path getInstallDirectory() {
        String userHome = System.getProperty("user.home");
        String appDir = PlatformUtils.isWindows() 
            ? userHome + "\\.eca\\tools"
            : userHome + "/.eca/tools";
        return Paths.get(appDir);
    }

    private Path getLocalAdbPath() {
        if (adbExecutable != null && Files.exists(adbExecutable)) {
            return adbExecutable;
        }

        Path installDir = getInstallDirectory();
        String adbName = PlatformUtils.isWindows() ? "adb.exe" : "adb";
        
        // Check in platform-tools subdirectory
        Path platformTools = installDir.resolve("platform-tools").resolve(adbName);
        if (Files.exists(platformTools)) {
            adbExecutable = platformTools;
            return platformTools;
        }

        // Check in root install directory
        Path rootAdb = installDir.resolve(adbName);
        if (Files.exists(rootAdb)) {
            adbExecutable = rootAdb;
            return rootAdb;
        }

        // Return expected path
        adbExecutable = platformTools;
        return platformTools;
    }

    private void downloadFile(String urlStr, Path destination) throws IOException {
        log.info("Downloading ADB platform tools...");
        URL url = new URL(urlStr);
        
        try (ReadableByteChannel rbc = Channels.newChannel(url.openStream());
             FileOutputStream fos = new FileOutputStream(destination.toFile())) {
            
            long bytesTransferred = fos.getChannel().transferFrom(rbc, 0, Long.MAX_VALUE);
            log.info("Downloaded {} MB", bytesTransferred / (1024 * 1024));
        }
    }

    private void extractZip(Path zipFile, Path destDir) throws IOException {
        log.info("Extracting ADB platform tools...");
        int fileCount = 0;
        
        try (ZipInputStream zis = new ZipInputStream(new FileInputStream(zipFile.toFile()))) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                Path filePath = destDir.resolve(entry.getName());
                
                if (entry.isDirectory()) {
                    Files.createDirectories(filePath);
                } else {
                    Files.createDirectories(filePath.getParent());
                    try (FileOutputStream fos = new FileOutputStream(filePath.toFile())) {
                        byte[] buffer = new byte[8192];
                        int len;
                        while ((len = zis.read(buffer)) > 0) {
                            fos.write(buffer, 0, len);
                        }
                    }
                    fileCount++;
                }
                zis.closeEntry();
            }
        }
        
        log.info("Extracted {} files", fileCount);
    }

    private String getAdbCommand() {
        if (adbExecutable != null && Files.exists(adbExecutable)) {
            return adbExecutable.toString();
        }
        return PlatformUtils.isWindows() ? "adb.exe" : "adb";
    }

    public String getAdbExecutablePath() {
        if (isAdbInPath()) {
            return findAdbInPath();
        }
        Path localAdb = getLocalAdbPath();
        return Files.exists(localAdb) ? localAdb.toString() : "adb";
    }

    @Data
    public static class AdbStatus {
        private boolean installed;
        private boolean inPath;
        private boolean autoInstalled;
        private String path;
        private String version;
        private String message;
    }
}
