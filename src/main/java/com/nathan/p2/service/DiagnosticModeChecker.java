package com.nathan.p2.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.file.Path;
import java.nio.file.Paths;

@Slf4j
@Service
public class DiagnosticModeChecker {
    
    // Qualcomm diagnostic mode USB IDs (matches backend-scat-old-codebase)
    private static final String QUALCOMM_VENDOR_ID = "05c6";
    private static final String[] DIAGNOSTIC_PRODUCT_IDS = {"90b8", "90db"};
    
    /**
     * Check if device is in diagnostic mode
     * Matches: backend-scat-old-codebase/scripts/capture/single_device_capture.sh
     */
    public DiagnosticModeResult checkDiagnosticMode(String deviceId) {
        log.info("Checking diagnostic mode for device: {}", deviceId);
        
        // Run Python checker script
        Path checkerScript = Paths.get("scat", "check_diagnostic_mode.py").toAbsolutePath();
        
        try {
            String pythonCmd = System.getProperty("os.name").toLowerCase().contains("win") 
                ? "python" : "python3";
            
            ProcessBuilder pb = new ProcessBuilder(pythonCmd, checkerScript.toString());
            pb.redirectErrorStream(true);
            Process process = pb.start();
            
            StringBuilder output = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    output.append(line).append("\n");
                    log.debug("Diagnostic check: {}", line);
                }
            }
            
            int exitCode = process.waitFor();
            String outputStr = output.toString();
            
            if (exitCode == 0) {
                // Device is in diagnostic mode
                String usbAddress = extractUsbAddress(outputStr);
                return DiagnosticModeResult.success(usbAddress);
            } else {
                // Device is NOT in diagnostic mode
                String reason = extractReason(outputStr);
                return DiagnosticModeResult.failure(reason);
            }
            
        } catch (Exception e) {
            log.error("Error checking diagnostic mode", e);
            return DiagnosticModeResult.failure("Error: " + e.getMessage());
        }
    }
    
    private String extractUsbAddress(String output) {
        // Extract "USB Address: X:Y" from output
        String[] lines = output.split("\n");
        for (String line : lines) {
            if (line.contains("USB Address:")) {
                String[] parts = line.split(":");
                if (parts.length >= 2) {
                    return parts[1].trim();
                }
            }
        }
        return "unknown";
    }
    
    private String extractReason(String output) {
        // Extract "Reason: ..." from output
        String[] lines = output.split("\n");
        for (String line : lines) {
            if (line.contains("Reason:")) {
                String[] parts = line.split("Reason:");
                if (parts.length >= 2) {
                    return parts[1].trim();
                }
            }
        }
        return "Device not in diagnostic mode";
    }
    
    public static class DiagnosticModeResult {
        private final boolean inDiagnosticMode;
        private final String usbAddress;
        private final String message;
        
        private DiagnosticModeResult(boolean inDiagnosticMode, String usbAddress, String message) {
            this.inDiagnosticMode = inDiagnosticMode;
            this.usbAddress = usbAddress;
            this.message = message;
        }
        
        public static DiagnosticModeResult success(String usbAddress) {
            return new DiagnosticModeResult(true, usbAddress, "Device in diagnostic mode");
        }
        
        public static DiagnosticModeResult failure(String reason) {
            return new DiagnosticModeResult(false, null, reason);
        }
        
        public boolean isInDiagnosticMode() {
            return inDiagnosticMode;
        }
        
        public String getUsbAddress() {
            return usbAddress;
        }
        
        public String getMessage() {
            return message;
        }
        
        public String getInstructions() {
            if (inDiagnosticMode) {
                return "Device ready for capture";
            }
            return "Enable diagnostic mode:\n" +
                   "1. Dial *#0808# on device\n" +
                   "2. Select 'DM + MODEM + ADB'\n" +
                   "3. Reboot device";
        }
    }
}
