package com.nathan.p2.controller;

import com.nathan.p2.repository.SessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.file.Paths;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@RestController
@RequestMapping("/api/lte")
@RequiredArgsConstructor
public class LteController {
    private final SessionRepository sessionRepository;

    @GetMapping("/session/{sessionId}/rrc-state")
    public Mono<Map<String, Object>> getRrcState(@PathVariable Long sessionId) {
        return sessionRepository.findById(sessionId)
            .flatMap(session -> Mono.fromCallable(() -> {
                // Parse SCAT output for LTE RRC State
                var logPath = Paths.get(session.getSessionDir(), "scat_output.log");
                List<Map<String, String>> states = new ArrayList<>();
                String currentState = "UNKNOWN";
                
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(
                        new ProcessBuilder("grep", "LTE RRC State", logPath.toString())
                            .start().getInputStream()))) {
                    String line;
                    Pattern pattern = Pattern.compile("LTE RRC State: (\\w+)");
                    while ((line = reader.readLine()) != null) {
                        Matcher m = pattern.matcher(line);
                        if (m.find()) {
                            currentState = m.group(1);
                            states.add(Map.of("state", currentState, "line", line));
                        }
                    }
                } catch (Exception e) {
                    log.warn("Could not parse RRC state from SCAT output", e);
                }
                
                Map<String, Object> result = new HashMap<>();
                result.put("sessionId", sessionId);
                result.put("currentState", currentState);
                result.put("stateHistory", states);
                result.put("totalTransitions", states.size());
                return result;
            }));
    }

    @GetMapping("/session/{sessionId}/nas")
    public Mono<Map<String, Object>> getNasMessages(@PathVariable Long sessionId) {
        return sessionRepository.findById(sessionId)
            .flatMap(session -> Mono.fromCallable(() -> {
                // Parse SCAT output for NAS messages
                var logPath = Paths.get(session.getSessionDir(), "scat_output.log");
                List<String> nasMessages = new ArrayList<>();
                int attachReq = 0, attachAcc = 0, tauReq = 0, tauAcc = 0;
                
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(
                        new ProcessBuilder("grep", "-E", "ATTACH|TAU|NAS", logPath.toString())
                            .start().getInputStream()))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        nasMessages.add(line);
                        if (line.contains("ATTACH_REQUEST") || line.contains("0x41")) attachReq++;
                        if (line.contains("ATTACH_ACCEPT") || line.contains("0x42")) attachAcc++;
                        if (line.contains("TAU_REQUEST") || line.contains("0x48")) tauReq++;
                        if (line.contains("TAU_ACCEPT") || line.contains("0x49")) tauAcc++;
                    }
                } catch (Exception e) {
                    log.warn("Could not parse NAS messages from SCAT output", e);
                }
                
                Map<String, Object> result = new HashMap<>();
                result.put("sessionId", sessionId);
                result.put("messages", nasMessages.subList(0, Math.min(20, nasMessages.size())));
                result.put("attachSuccess", attachReq > 0 ? (attachAcc * 100.0 / attachReq) : 0.0);
                result.put("tauSuccess", tauReq > 0 ? (tauAcc * 100.0 / tauReq) : 0.0);
                result.put("totalMessages", nasMessages.size());
                return result;
            }));
    }
}
