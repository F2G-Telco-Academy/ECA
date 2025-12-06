package com.nathan.p2.service.process;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
public class ExternalToolService {
    private final Map<String, Process> processes = new ConcurrentHashMap<>();

    public Mono<ProcessHandle> start(ProcessSpec spec) {
        return Mono.fromCallable(() -> {
            List<String> cmd = new ArrayList<>();
            cmd.add(spec.command());
            cmd.addAll(spec.args());
            
            ProcessBuilder pb = new ProcessBuilder(cmd);
            pb.directory(spec.workingDirectory().toFile());
            pb.environment().putAll(spec.environment());
            
            Process p = pb.start();
            processes.put(spec.id(), p);
            log.info("Started: {} (PID: {})", spec.id(), p.pid());
            return p.toHandle();
        }).subscribeOn(Schedulers.boundedElastic());
    }

    public Flux<String> logs(ProcessHandle handle) {
        return Flux.<String>create(sink -> {
            Process p = processes.values().stream()
                .filter(proc -> proc.toHandle().equals(handle))
                .findFirst().orElse(null);
            
            if (p == null) {
                sink.error(new IllegalStateException("Process not found"));
                return;
            }
            
            try (BufferedReader r = new BufferedReader(new InputStreamReader(p.getInputStream()))) {
                String line;
                while ((line = r.readLine()) != null) {
                    sink.next(line);
                }
                sink.complete();
            } catch (Exception e) {
                sink.error(e);
            }
        }).subscribeOn(Schedulers.boundedElastic());
    }

    public Mono<Integer> stop(ProcessHandle handle) {
        return Mono.fromCallable(() -> {
            Process p = processes.values().stream()
                .filter(proc -> proc.toHandle().equals(handle))
                .findFirst().orElse(null);
            
            if (p == null) return 0;
            
            p.destroy();
            if (!p.waitFor(10, TimeUnit.SECONDS)) {
                p.destroyForcibly();
            }
            
            int code = p.exitValue();
            processes.values().remove(p);
            log.info("Stopped with code: {}", code);
            return code;
        }).subscribeOn(Schedulers.boundedElastic());
    }

    public Mono<Integer> awaitExit(ProcessHandle handle) {
        return Mono.fromCallable(() -> {
            Process p = processes.values().stream()
                .filter(proc -> proc.toHandle().equals(handle))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Process not found"));
            return p.waitFor();
        }).subscribeOn(Schedulers.boundedElastic());
    }
}
