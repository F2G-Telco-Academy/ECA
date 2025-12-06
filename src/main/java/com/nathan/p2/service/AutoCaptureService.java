package com.nathan.p2.service;

import com.nathan.p2.domain.SessionStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class AutoCaptureService {
    
    private final DeviceDetectorService deviceDetectorService;
    private final CaptureOrchestrationService captureService;
    private final SessionService sessionService;
    
    private final Set<String> activeDevices = new HashSet<>();

    @EventListener(ApplicationReadyEvent.class)
    public void startAutoCapture() {
        log.info("Starting auto-capture service...");
        
        deviceDetectorService.detectDevices()
                .subscribe(
                        deviceEvent -> {
                            String deviceId = deviceEvent.getDeviceId();
                            
                            switch (deviceEvent.getEventType()) {
                                case CONNECTED:
                                    if (!activeDevices.contains(deviceId)) {
                                        log.info("Device connected: {}, starting capture", deviceId);
                                        activeDevices.add(deviceId);
                                        
                                        captureService.startCapture(deviceId)
                                                .subscribe(
                                                        session -> log.info("Auto-capture started for device {} in session {}", 
                                                                deviceId, session.getId()),
                                                        error -> {
                                                            log.error("Failed to start auto-capture for device {}", deviceId, error);
                                                            activeDevices.remove(deviceId);
                                                        }
                                                );
                                    }
                                    break;
                                    
                                case DISCONNECTED:
                                    if (activeDevices.contains(deviceId)) {
                                        log.info("Device disconnected: {}, stopping capture", deviceId);
                                        activeDevices.remove(deviceId);
                                        
                                        // Find active session for this device and stop it
                                        sessionService.getAllSessions()
                                                .filter(session -> deviceId.equals(session.getDeviceId()) 
                                                        && session.getStatus() == SessionStatus.CAPTURING)
                                                .next()
                                                .flatMap(session -> captureService.stopCapture(session.getId()))
                                                .subscribe(
                                                        () -> log.info("Auto-capture stopped for device {}", deviceId),
                                                        error -> log.error("Failed to stop auto-capture for device {}", deviceId, error)
                                                );
                                    }
                                    break;
                            }
                        },
                        error -> log.error("Error in device detection", error),
                        () -> log.info("Device detection stream completed")
                );
    }
}
