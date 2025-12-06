package com.nathan.p2.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
public class AdbCommandExecutor {

    public Mono<String> execute(String... command) {
        return Mono.fromCallable(() -> {
            ProcessBuilder pb = new ProcessBuilder(command);
            pb.redirectErrorStream(true);
            
            Process process = pb.start();
            
            StringBuilder output = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    output.append(line).append("\n");
                }
            }
            
            boolean finished = process.waitFor(10, TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                throw new RuntimeException("ADB command timeout");
            }
            
            int exitCode = process.exitValue();
            if (exitCode != 0) {
                log.warn("ADB command failed with exit code {}: {}", exitCode, String.join(" ", command));
            }
            
            return output.toString();
        }).subscribeOn(Schedulers.boundedElastic())
          .doOnError(e -> log.error("ADB command error: {}", e.getMessage()));
    }
}
