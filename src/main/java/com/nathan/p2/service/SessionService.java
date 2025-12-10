package com.nathan.p2.service;

import com.nathan.p2.config.ToolsConfig;
import com.nathan.p2.domain.Session;
import com.nathan.p2.domain.SessionStatus;
import com.nathan.p2.repository.SessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class SessionService {
    
    private final SessionRepository sessionRepository;
    private final ToolsConfig toolsConfig;
    private final DeviceDetectorService deviceDetectorService;

    public Mono<Session> createSession(String deviceId) {
        return deviceDetectorService.getDeviceModel(deviceId)
                .zipWith(deviceDetectorService.getDeviceFirmware(deviceId))
                .flatMap(tuple -> {
                    String model = tuple.getT1();
                    String firmware = tuple.getT2();
                    
                    String sessionDir = createSessionDirectory(deviceId);
                    
                    Session session = Session.builder()
                            .deviceId(deviceId)
                            .deviceModel(model)
                            .firmware(firmware)
                            .startTime(LocalDateTime.now())
                            .status(SessionStatus.STARTING)
                            .sessionDir(sessionDir)
                            .build();
                    
                    return sessionRepository.save(session);
                })
                .doOnSuccess(session -> log.info("Created session {} for device {}", 
                        session.getId(), deviceId));
    }

    public Mono<Session> updateSessionStatus(Long sessionId, SessionStatus status) {
        return sessionRepository.findById(sessionId)
                .flatMap(session -> {
                    session.setStatus(status);
                    if (status == SessionStatus.COMPLETED || status == SessionStatus.FAILED) {
                        session.setEndTime(LocalDateTime.now());
                    }
                    return sessionRepository.save(session);
                });
    }

    public Mono<Session> getSession(Long sessionId) {
        return sessionRepository.findById(sessionId);
    }

    public Flux<Session> getAllSessions() {
        return sessionRepository.findAll();
    }

    public Flux<Session> getRecentSessions(int limit) {
        return sessionRepository.findRecentSessions(limit);
    }

    public Mono<Session> createOfflineSession(String deviceId, String pcapPath) {
        Session session = Session.builder()
                .deviceId(deviceId)
                .deviceModel("Offline")
                .firmware("N/A")
                .startTime(LocalDateTime.now())
                .endTime(LocalDateTime.now())
                .status(SessionStatus.COMPLETED)
                .sessionDir(java.nio.file.Paths.get(pcapPath).getParent().toString())
                .build();
        return sessionRepository.save(session);
    }

    private String createSessionDirectory(String deviceId) {
        try {
            String timestamp = LocalDateTime.now().toString().replace(":", "-");
            Path sessionPath = Paths.get(toolsConfig.getStorage().getBaseDir(), 
                    deviceId + "_" + timestamp);
            Files.createDirectories(sessionPath);
            return sessionPath.toString();
        } catch (Exception e) {
            log.error("Error creating session directory", e);
            return toolsConfig.getStorage().getBaseDir();
        }
    }
}
