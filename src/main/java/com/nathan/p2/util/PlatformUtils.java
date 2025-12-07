package com.nathan.p2.util;

import lombok.extern.slf4j.Slf4j;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.List;

/**
 * Platform-aware utility for resolving tool paths
 * Handles Windows/Linux/Mac differences
 */
@Slf4j
public class PlatformUtils {
    
    private static final boolean IS_WINDOWS = System.getProperty("os.name").toLowerCase().contains("win");
    private static final boolean IS_MAC = System.getProperty("os.name").toLowerCase().contains("mac");
    
    /**
     * Resolve ADB executable path
     */
    public static String resolveAdbPath(String configuredPath) {
        if (configuredPath != null && !configuredPath.isEmpty() && new File(configuredPath).exists()) {
            return configuredPath;
        }
        
        if (IS_WINDOWS) {
            // Try common Windows locations
            List<String> windowsPaths = Arrays.asList(
                "adb.exe",
                "C:\\Android\\platform-tools\\adb.exe",
                "C:\\Program Files (x86)\\Android\\android-sdk\\platform-tools\\adb.exe",
                System.getenv("LOCALAPPDATA") + "\\Android\\Sdk\\platform-tools\\adb.exe"
            );
            
            for (String path : windowsPaths) {
                if (path != null && new File(path).exists()) {
                    log.info("Found ADB at: {}", path);
                    return path;
                }
            }
            return "adb.exe"; // Fallback to PATH
        }
        
        return "adb"; // Linux/Mac
    }
    
    /**
     * Resolve Python executable path
     */
    public static String resolvePythonPath(String configuredPath) {
        if (configuredPath != null && !configuredPath.isEmpty() && new File(configuredPath).exists()) {
            return configuredPath;
        }
        
        if (IS_WINDOWS) {
            // Try common Windows locations
            List<String> windowsPaths = Arrays.asList(
                "python.exe",
                "py.exe",
                "C:\\Python311\\python.exe",
                "C:\\Python310\\python.exe",
                "C:\\Python39\\python.exe",
                System.getenv("LOCALAPPDATA") + "\\Programs\\Python\\Python311\\python.exe"
            );
            
            for (String path : windowsPaths) {
                if (path != null && new File(path).exists()) {
                    log.info("Found Python at: {}", path);
                    return path;
                }
            }
            return "python.exe"; // Fallback to PATH
        }
        
        return "python3"; // Linux/Mac
    }
    
    /**
     * Resolve TShark executable path
     */
    public static String resolveTSharkPath(String configuredPath) {
        if (configuredPath != null && !configuredPath.isEmpty() && new File(configuredPath).exists()) {
            return configuredPath;
        }
        
        if (IS_WINDOWS) {
            // Try common Windows locations
            List<String> windowsPaths = Arrays.asList(
                "tshark.exe",
                "C:\\Program Files\\Wireshark\\tshark.exe",
                "C:\\Program Files (x86)\\Wireshark\\tshark.exe"
            );
            
            for (String path : windowsPaths) {
                if (new File(path).exists()) {
                    log.info("Found TShark at: {}", path);
                    return path;
                }
            }
            return "tshark.exe"; // Fallback to PATH
        }
        
        return "tshark"; // Linux/Mac
    }
    
    /**
     * Check if running on Windows
     */
    public static boolean isWindows() {
        return IS_WINDOWS;
    }
    
    /**
     * Check if running on Mac
     */
    public static boolean isMac() {
        return IS_MAC;
    }
    
    /**
     * Check if running on Linux
     */
    public static boolean isLinux() {
        return !IS_WINDOWS && !IS_MAC;
    }
    
    /**
     * Get platform name
     */
    public static String getPlatformName() {
        if (IS_WINDOWS) return "Windows";
        if (IS_MAC) return "macOS";
        return "Linux";
    }
}
