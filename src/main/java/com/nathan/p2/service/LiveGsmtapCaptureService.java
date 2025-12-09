package com.nathan.p2.service;

import com.nathan.p2.config.ToolsConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Live GSMTAP Capture Service
 * Captures diagnostic logs from devices and converts to GSMTAP-encapsulated PCAP
 * 
 * Flow: Device → ADB logcat → Parse Diag → GSMTAP Wrap → PCAP → TShark
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LiveGsmtapCaptureService {
    
    private final ToolsConfig config;
    private final AdbAutoInstallerService adbInstaller;
    
    private final Map<String, Process> activeCaptureProcesses = new ConcurrentHashMap<>();
    private final Map<String, Sinks.Many<byte[]>> deviceSinks = new ConcurrentHashMap<>();
    
    /**
     * Start live capture from device with GSMTAP encapsulation
     * This creates a proper PCAP file that can be processed by TShark
     */
    public Flux<byte[]> startLiveCapture(String deviceId, Long sessionId) {
        log.info("🔴 Starting live GSMTAP capture for device: {}", deviceId);
        
        Sinks.Many<byte[]> sink = Sinks.many().multicast().onBackpressureBuffer();
        deviceSinks.put(deviceId, sink);
        
        // Create capture file path
        Path captureDir = Paths.get("./data/sessions/session_" + sessionId);
        try {
            Files.createDirectories(captureDir);
        } catch (IOException e) {
            log.error("Failed to create capture directory", e);
            sink.tryEmitError(e);
            return sink.asFlux();
        }
        
        Path pcapFile = captureDir.resolve("live_capture.pcap");
        
        // Start capture in background thread
        new Thread(() -> {
            try {
                captureLiveTraffic(deviceId, pcapFile, sink);
            } catch (Exception e) {
                log.error("Live capture failed", e);
                sink.tryEmitError(e);
            }
        }, "live-capture-" + deviceId).start();
        
        return sink.asFlux()
            .doOnCancel(() -> stopCapture(deviceId))
            .doOnError(e -> log.error("Capture stream error", e));
    }
    
    /**
     * Capture live traffic using multiple strategies
     */
    private void captureLiveTraffic(String deviceId, Path pcapFile, Sinks.Many<byte[]> sink) throws IOException {
        String adbPath = adbInstaller.getAdbExecutablePath();
        
        // Strategy 1: Try tcpdump on device (if rooted)
        if (tryTcpdumpCapture(deviceId, adbPath, pcapFile, sink)) {
            log.info("✅ Using tcpdump capture (rooted device)");
            return;
        }
        
        // Strategy 2: Try ADB logcat with GSMTAP wrapper
        if (tryLogcatWithGsmtapWrapper(deviceId, adbPath, pcapFile, sink)) {
            log.info("✅ Using logcat with GSMTAP wrapper");
            return;
        }
        
        // Strategy 3: Try USB tethering + local capture
        if (tryUsbTetheringCapture(deviceId, pcapFile, sink)) {
            log.info("✅ Using USB tethering capture");
            return;
        }
        
        log.error("❌ No capture method succeeded");
        sink.tryEmitError(new RuntimeException("Unable to start live capture - device may need root or USB debugging"));
    }
    
    /**
     * Strategy 1: Direct tcpdump on rooted device
     */
    private boolean tryTcpdumpCapture(String deviceId, String adbPath, Path pcapFile, Sinks.Many<byte[]> sink) {
        try {
            // Check if tcpdump is available on device
            Process checkProcess = new ProcessBuilder(
                adbPath, "-s", deviceId, "shell", "which", "tcpdump"
            ).start();
            
            if (checkProcess.waitFor() != 0) {
                return false; // tcpdump not available
            }
            
            log.info("📱 Device has tcpdump, starting capture...");
            
            // Start tcpdump on device, pulling GSMTAP packets
            ProcessBuilder pb = new ProcessBuilder(
                adbPath, "-s", deviceId, "shell",
                "tcpdump", "-i", "any", "-U", "-w", "-",
                "udp", "port", "4729"  // GSMTAP port
            );
            
            Process captureProcess = pb.start();
            activeCaptureProcesses.put(deviceId, captureProcess);
            
            // Stream PCAP data
            try (FileOutputStream fos = new FileOutputStream(pcapFile.toFile());
                 InputStream is = captureProcess.getInputStream()) {
                
                byte[] buffer = new byte[65535];
                int bytesRead;
                
                while ((bytesRead = is.read(buffer)) != -1) {
                    // Write to file
                    fos.write(buffer, 0, bytesRead);
                    fos.flush();
                    
                    // Emit to stream
                    byte[] packet = new byte[bytesRead];
                    System.arraycopy(buffer, 0, packet, 0, bytesRead);
                    sink.tryEmitNext(packet);
                }
            }
            
            return true;
            
        } catch (Exception e) {
            log.warn("tcpdump capture failed: {}", e.getMessage());
            return false;
        }
    }
    
    /**
     * Strategy 2: ADB logcat with GSMTAP wrapper
     * Parses Qualcomm diag messages and wraps in GSMTAP
     */
    private boolean tryLogcatWithGsmtapWrapper(String deviceId, String adbPath, Path pcapFile, Sinks.Many<byte[]> sink) {
        try {
            log.info("📱 Using logcat with GSMTAP wrapper...");
            
            // Start logcat for radio logs
            ProcessBuilder pb = new ProcessBuilder(
                adbPath, "-s", deviceId, "logcat", "-b", "radio", "-v", "raw"
            );
            
            Process logcatProcess = pb.start();
            activeCaptureProcesses.put(deviceId, logcatProcess);
            
            // Create PCAP writer
            PcapWriter pcapWriter = new PcapWriter(pcapFile);
            pcapWriter.writeGlobalHeader();
            
            // Parse logcat and wrap in GSMTAP
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(logcatProcess.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    // Parse diagnostic message from logcat
                    byte[] diagMessage = parseDiagMessage(line);
                    if (diagMessage != null) {
                        // Wrap in GSMTAP
                        byte[] gsmtapPacket = wrapInGsmtap(diagMessage);
                        
                        // Write to PCAP
                        pcapWriter.writePacket(gsmtapPacket);
                        
                        // Emit to stream
                        sink.tryEmitNext(gsmtapPacket);
                    }
                }
            }
            
            pcapWriter.close();
            return true;
            
        } catch (Exception e) {
            log.warn("Logcat GSMTAP wrapper failed: {}", e.getMessage());
            return false;
        }
    }
    
    /**
     * Strategy 3: USB tethering + local tcpdump
     */
    private boolean tryUsbTetheringCapture(String deviceId, Path pcapFile, Sinks.Many<byte[]> sink) {
        try {
            log.info("📱 Trying USB tethering capture...");
            
            // Enable USB tethering on device
            String adbPath = adbInstaller.getAdbExecutablePath();
            Process tetheringProcess = new ProcessBuilder(
                adbPath, "-s", deviceId, "shell",
                "svc", "usb", "setFunctions", "rndis"
            ).start();
            
            if (tetheringProcess.waitFor() != 0) {
                return false;
            }
            
            Thread.sleep(2000); // Wait for interface to come up
            
            // Find USB network interface
            String usbInterface = findUsbInterface();
            if (usbInterface == null) {
                return false;
            }
            
            log.info("📱 Found USB interface: {}", usbInterface);
            
            // Start tcpdump on USB interface
            ProcessBuilder pb = new ProcessBuilder(
                "tcpdump", "-i", usbInterface,
                "-U", "-w", pcapFile.toString(),
                "udp", "port", "4729"
            );
            
            Process captureProcess = pb.start();
            activeCaptureProcesses.put(deviceId, captureProcess);
            
            // Monitor capture file and stream packets
            monitorPcapFile(pcapFile, sink);
            
            return true;
            
        } catch (Exception e) {
            log.warn("USB tethering capture failed: {}", e.getMessage());
            return false;
        }
    }
    
    /**
     * Parse Qualcomm diagnostic message from logcat
     */
    private byte[] parseDiagMessage(String logLine) {
        // Check if line contains diagnostic data
        if (!logLine.contains("QC_IMAGE") && !logLine.contains("DIAG")) {
            return null;
        }
        
        try {
            // Extract hex data from log line
            // Format: "01 23 45 67 89 ab cd ef"
            String[] hexBytes = logLine.replaceAll("[^0-9a-fA-F ]", "").split("\\s+");
            byte[] diagData = new byte[hexBytes.length];
            
            for (int i = 0; i < hexBytes.length; i++) {
                if (!hexBytes[i].isEmpty()) {
                    diagData[i] = (byte) Integer.parseInt(hexBytes[i], 16);
                }
            }
            
            return diagData;
        } catch (Exception e) {
            return null;
        }
    }
    
    /**
     * Wrap diagnostic message in GSMTAP header
     * GSMTAP specification: https://osmocom.org/projects/baseband/wiki/GSMTAP
     */
    private byte[] wrapInGsmtap(byte[] diagMessage) {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        
        try {
            // GSMTAP header (16 bytes minimum)
            baos.write(0x02);  // Version
            baos.write(0x04);  // Header length (4 * 4 bytes = 16 bytes)
            baos.write(0x0D);  // Type: LTE RRC (13)
            baos.write(0x00);  // Timeslot
            
            // ARFCN (2 bytes)
            baos.write(0x00);
            baos.write(0x00);
            
            // Signal level (1 byte)
            baos.write((byte) 0x80);  // Unknown
            
            // SNR (1 byte)
            baos.write((byte) 0x80);  // Unknown
            
            // Frame number (4 bytes)
            baos.write(0x00);
            baos.write(0x00);
            baos.write(0x00);
            baos.write(0x00);
            
            // Sub-type (1 byte) - LTE RRC UL-CCCH
            baos.write(0x01);
            
            // Antenna (1 byte)
            baos.write(0x00);
            
            // Sub-slot (1 byte)
            baos.write(0x00);
            
            // Padding (1 byte)
            baos.write(0x00);
            
            // Payload
            baos.write(diagMessage);
            
            return baos.toByteArray();
            
        } catch (IOException e) {
            log.error("Failed to wrap in GSMTAP", e);
            return new byte[0];
        }
    }
    
    /**
     * Find USB network interface
     */
    private String findUsbInterface() {
        try {
            Process ifconfigProcess = new ProcessBuilder("ifconfig").start();
            BufferedReader reader = new BufferedReader(new InputStreamReader(ifconfigProcess.getInputStream()));
            
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.contains("usb") || line.contains("rndis")) {
                    return line.split(":")[0].trim();
                }
            }
        } catch (Exception e) {
            log.warn("Failed to find USB interface", e);
        }
        return null;
    }
    
    /**
     * Monitor PCAP file and stream new packets
     */
    private void monitorPcapFile(Path pcapFile, Sinks.Many<byte[]> sink) {
        new Thread(() -> {
            try (RandomAccessFile raf = new RandomAccessFile(pcapFile.toFile(), "r")) {
                long lastPosition = 0;
                
                while (!Thread.currentThread().isInterrupted()) {
                    long fileLength = raf.length();
                    
                    if (fileLength > lastPosition) {
                        raf.seek(lastPosition);
                        byte[] buffer = new byte[(int) (fileLength - lastPosition)];
                        raf.read(buffer);
                        
                        sink.tryEmitNext(buffer);
                        lastPosition = fileLength;
                    }
                    
                    Thread.sleep(100);  // Poll every 100ms
                }
            } catch (Exception e) {
                log.error("File monitoring failed", e);
            }
        }, "pcap-monitor").start();
    }
    
    /**
     * Stop capture for device
     */
    public void stopCapture(String deviceId) {
        log.info("🛑 Stopping capture for device: {}", deviceId);
        
        Process process = activeCaptureProcesses.remove(deviceId);
        if (process != null && process.isAlive()) {
            process.destroy();
            try {
                process.waitFor(5, java.util.concurrent.TimeUnit.SECONDS);
                if (process.isAlive()) {
                    process.destroyForcibly();
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
        
        Sinks.Many<byte[]> sink = deviceSinks.remove(deviceId);
        if (sink != null) {
            sink.tryEmitComplete();
        }
    }
    
    /**
     * Simple PCAP file writer
     */
    private static class PcapWriter {
        private final FileOutputStream fos;
        
        public PcapWriter(Path file) throws IOException {
            this.fos = new FileOutputStream(file.toFile());
        }
        
        public void writeGlobalHeader() throws IOException {
            // PCAP Global Header
            fos.write(new byte[]{
                (byte) 0xd4, (byte) 0xc3, (byte) 0xb2, (byte) 0xa1,  // Magic number
                0x02, 0x00,  // Version major
                0x04, 0x00,  // Version minor
                0x00, 0x00, 0x00, 0x00,  // Thiszone
                0x00, 0x00, 0x00, 0x00,  // Sigfigs
                (byte) 0xff, (byte) 0xff, 0x00, 0x00,  // Snaplen (65535)
                0x01, 0x00, 0x00, 0x00   // Network (Ethernet)
            });
            fos.flush();
        }
        
        public void writePacket(byte[] packetData) throws IOException {
            long timestamp = System.currentTimeMillis();
            int ts_sec = (int) (timestamp / 1000);
            int ts_usec = (int) ((timestamp % 1000) * 1000);
            int length = packetData.length;
            
            // Packet Header (16 bytes)
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            
            // Timestamp seconds (4 bytes, little-endian)
            baos.write(ts_sec & 0xFF);
            baos.write((ts_sec >> 8) & 0xFF);
            baos.write((ts_sec >> 16) & 0xFF);
            baos.write((ts_sec >> 24) & 0xFF);
            
            // Timestamp microseconds (4 bytes, little-endian)
            baos.write(ts_usec & 0xFF);
            baos.write((ts_usec >> 8) & 0xFF);
            baos.write((ts_usec >> 16) & 0xFF);
            baos.write((ts_usec >> 24) & 0xFF);
            
            // Captured length (4 bytes, little-endian)
            baos.write(length & 0xFF);
            baos.write((length >> 8) & 0xFF);
            baos.write((length >> 16) & 0xFF);
            baos.write((length >> 24) & 0xFF);
            
            // Actual length (4 bytes, little-endian)
            baos.write(length & 0xFF);
            baos.write((length >> 8) & 0xFF);
            baos.write((length >> 16) & 0xFF);
            baos.write((length >> 24) & 0xFF);
            
            // Write header + packet
            fos.write(baos.toByteArray());
            fos.write(packetData);
            fos.flush();
        }
        
        public void close() throws IOException {
            fos.close();
        }
    }
}
