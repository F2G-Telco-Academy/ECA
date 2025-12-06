# Backend Implementation Plan - Extended Cellular Analyzer

**Version**: 0.1.0-SNAPSHOT  
**Target**: MVP Backend Completion  
**Estimated Time**: 4-6 hours

---

## Phase 1: Database Foundation (1 hour)

### Task 1.1: Create Database Schema
**File**: `src/main/resources/schema.sql`

```sql
-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    device_model TEXT,
    firmware TEXT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    status TEXT NOT NULL,
    session_dir TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Artifacts table
CREATE TABLE IF NOT EXISTS artifacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    path TEXT NOT NULL,
    size INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- KPI Aggregates table
CREATE TABLE IF NOT EXISTS kpi_aggregates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    metric TEXT NOT NULL,
    window_start TIMESTAMP NOT NULL,
    window_end TIMESTAMP NOT NULL,
    min_value REAL,
    avg_value REAL,
    max_value REAL,
    rat TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Anomalies table
CREATE TABLE IF NOT EXISTS anomalies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    category TEXT NOT NULL,
    severity TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    latitude REAL,
    longitude REAL,
    details_json TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- GPS Traces table
CREATE TABLE IF NOT EXISTS gps_traces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    altitude REAL,
    accuracy REAL,
    speed REAL,
    bearing REAL,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Error Reports table
CREATE TABLE IF NOT EXISTS error_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service TEXT NOT NULL,
    session_id INTEGER,
    level TEXT NOT NULL,
    message TEXT NOT NULL,
    stack_trace TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_device_id ON sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_artifacts_session_id ON artifacts(session_id);
CREATE INDEX IF NOT EXISTS idx_kpi_session_id ON kpi_aggregates(session_id);
CREATE INDEX IF NOT EXISTS idx_kpi_metric ON kpi_aggregates(metric);
CREATE INDEX IF NOT EXISTS idx_anomalies_session_id ON anomalies(session_id);
CREATE INDEX IF NOT EXISTS idx_gps_session_id ON gps_traces(session_id);
```

### Task 1.2: Add Schema Initialization
**File**: `src/main/java/com/nathan/p2/config/DatabaseConfig.java`

Add schema initialization bean:
```java
@Bean
public ConnectionFactoryInitializer initializer(ConnectionFactory connectionFactory) {
    ConnectionFactoryInitializer initializer = new ConnectionFactoryInitializer();
    initializer.setConnectionFactory(connectionFactory);
    
    CompositeDatabasePopulator populator = new CompositeDatabasePopulator();
    populator.addPopulators(new ResourceDatabasePopulator(
        new ClassPathResource("schema.sql")
    ));
    initializer.setDatabasePopulator(populator);
    
    return initializer;
}
```

### Task 1.3: Add GPS Trace Entity
**File**: `src/main/java/com/nathan/p2/domain/GpsTrace.java`

```java
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("gps_traces")
public class GpsTrace {
    @Id
    private Long id;
    private Long sessionId;
    private LocalDateTime timestamp;
    private Double latitude;
    private Double longitude;
    private Double altitude;
    private Double accuracy;
    private Double speed;
    private Double bearing;
}
```

### Task 1.4: Add GPS Repository
**File**: `src/main/java/com/nathan/p2/repository/GpsTraceRepository.java`

```java
public interface GpsTraceRepository extends ReactiveCrudRepository<GpsTrace, Long> {
    Flux<GpsTrace> findBySessionIdOrderByTimestampAsc(Long sessionId);
}
```

**Commit**: `feat(database): add complete database schema with R2DBC initialization`

---

## Phase 2: Process Management (1.5 hours)

### Task 2.1: Complete ExternalToolService
**File**: `src/main/java/com/nathan/p2/service/process/ExternalToolService.java`

```java
@Slf4j
@Service
public class ExternalToolService {
    private final Map<String, Process> activeProcesses = new ConcurrentHashMap<>();
    
    public Mono<ProcessHandle> start(ProcessSpec spec) {
        return Mono.fromCallable(() -> {
            log.info("Starting process: {}", spec.id());
            
            ProcessBuilder pb = new ProcessBuilder();
            pb.command(buildCommand(spec));
            pb.directory(spec.workingDirectory().toFile());
            pb.environment().putAll(spec.environment());
            pb.redirectErrorStream(false);
            
            Process process = pb.start();
            activeProcesses.put(spec.id(), process);
            
            log.info("Process started: {} (PID: {})", spec.id(), process.pid());
            return process.toHandle();
        }).subscribeOn(Schedulers.boundedElastic());
    }
    
    public Flux<String> logs(ProcessHandle handle) {
        return Flux.create(sink -> {
            Process process = handle.info().command()
                .flatMap(cmd -> activeProcesses.values().stream()
                    .filter(p -> p.toHandle().equals(handle))
                    .findFirst())
                .orElse(null);
                
            if (process == null) {
                sink.error(new IllegalStateException("Process not found"));
                return;
            }
            
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    sink.next(line);
                }
                sink.complete();
            } catch (IOException e) {
                sink.error(e);
            }
        }).subscribeOn(Schedulers.boundedElastic());
    }
    
    public Mono<Integer> stop(ProcessHandle handle) {
        return Mono.fromCallable(() -> {
            Optional<Process> processOpt = activeProcesses.values().stream()
                .filter(p -> p.toHandle().equals(handle))
                .findFirst();
                
            if (processOpt.isEmpty()) {
                return 0;
            }
            
            Process process = processOpt.get();
            process.destroy();
            
            if (!process.waitFor(10, TimeUnit.SECONDS)) {
                process.destroyForcibly();
            }
            
            int exitCode = process.exitValue();
            activeProcesses.values().remove(process);
            
            log.info("Process stopped with exit code: {}", exitCode);
            return exitCode;
        }).subscribeOn(Schedulers.boundedElastic());
    }
    
    public Mono<Integer> awaitExit(ProcessHandle handle) {
        return Mono.fromCallable(() -> {
            Process process = activeProcesses.values().stream()
                .filter(p -> p.toHandle().equals(handle))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Process not found"));
                
            return process.waitFor();
        }).subscribeOn(Schedulers.boundedElastic());
    }
    
    private List<String> buildCommand(ProcessSpec spec) {
        List<String> command = new ArrayList<>();
        command.add(spec.command());
        command.addAll(spec.args());
        return command;
    }
}
```

### Task 2.2: Create ProcessSpec Record
**File**: `src/main/java/com/nathan/p2/service/process/ProcessSpec.java`

```java
@Builder
public record ProcessSpec(
    String id,
    String command,
    List<String> args,
    Path workingDirectory,
    Map<String, String> environment
) {
    public ProcessSpec {
        args = args != null ? List.copyOf(args) : List.of();
        environment = environment != null ? Map.copyOf(environment) : Map.of();
    }
}
```

**Commit**: `feat(process): implement complete external tool process management`

---

## Phase 3: KPI Integration (1.5 hours)

### Task 3.1: Create KPI Calculator Service
**File**: `src/main/java/com/nathan/p2/service/KpiCalculatorService.java`

```java
@Slf4j
@Service
@RequiredArgsConstructor
public class KpiCalculatorService {
    private final ExternalToolService externalToolService;
    private final KpiAggregateRepository kpiRepository;
    private final ToolsConfig toolsConfig;
    private final ObjectMapper objectMapper;
    
    public Mono<Void> calculateKpis(Long sessionId, Path pcapFile) {
        log.info("Calculating KPIs for session {}", sessionId);
        
        Path scriptPath = Paths.get(toolsConfig.getTools().getScat().getPath())
            .getParent()
            .resolve("scripts/kpi_calculator_comprehensive.py");
            
        Path outputFile = pcapFile.getParent().resolve("kpis.json");
        
        ProcessSpec spec = ProcessSpec.builder()
            .id("kpi-calc-" + sessionId)
            .command("python3")
            .args(List.of(scriptPath.toString(), pcapFile.toString()))
            .workingDirectory(pcapFile.getParent())
            .environment(Map.of())
            .build();
            
        return externalToolService.start(spec)
            .flatMap(handle -> externalToolService.awaitExit(handle))
            .flatMap(exitCode -> {
                if (exitCode != 0) {
                    return Mono.error(new RuntimeException("KPI calculation failed with exit code: " + exitCode));
                }
                return parseAndSaveKpis(sessionId, outputFile);
            })
            .doOnSuccess(v -> log.info("KPI calculation completed for session {}", sessionId))
            .doOnError(e -> log.error("KPI calculation failed for session {}", sessionId, e));
    }
    
    private Mono<Void> parseAndSaveKpis(Long sessionId, Path kpiFile) {
        return Mono.fromCallable(() -> {
            String json = Files.readString(kpiFile);
            JsonNode root = objectMapper.readTree(json);
            return root;
        })
        .flatMapMany(root -> {
            List<KpiAggregate> kpis = new ArrayList<>();
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime windowStart = now.minusMinutes(5);
            
            // Parse LTE KPIs
            kpis.add(createKpi(sessionId, "LTE_RRC_SUCCESS_RATE", 
                root.path("lte_rrc_success").asDouble(), windowStart, now, "LTE"));
            kpis.add(createKpi(sessionId, "LTE_ATTACH_SUCCESS_RATE", 
                root.path("lte_attach_success").asDouble(), windowStart, now, "LTE"));
            kpis.add(createKpi(sessionId, "LTE_TAU_SUCCESS_RATE", 
                root.path("lte_tau_success").asDouble(), windowStart, now, "LTE"));
            kpis.add(createKpi(sessionId, "LTE_HANDOVER_SUCCESS_RATE", 
                root.path("lte_ho_success").asDouble(), windowStart, now, "LTE"));
            kpis.add(createKpi(sessionId, "LTE_SERVICE_REQUEST_SUCCESS_RATE", 
                root.path("lte_service_success").asDouble(), windowStart, now, "LTE"));
            
            // Parse WCDMA KPIs
            kpis.add(createKpi(sessionId, "WCDMA_RRC_SUCCESS_RATE", 
                root.path("wcdma_rrc_success").asDouble(), windowStart, now, "WCDMA"));
            kpis.add(createKpi(sessionId, "WCDMA_RAB_SUCCESS_RATE", 
                root.path("wcdma_rab_success").asDouble(), windowStart, now, "WCDMA"));
            kpis.add(createKpi(sessionId, "WCDMA_HANDOVER_SUCCESS_RATE", 
                root.path("wcdma_ho_success").asDouble(), windowStart, now, "WCDMA"));
            
            // Parse Call KPIs
            kpis.add(createKpi(sessionId, "CALL_SUCCESS_RATE", 
                root.path("call_success").asDouble(), windowStart, now, "CS"));
            kpis.add(createKpi(sessionId, "CALL_DROP_RATE", 
                root.path("call_drop_rate").asDouble(), windowStart, now, "CS"));
            
            return Flux.fromIterable(kpis);
        })
        .flatMap(kpiRepository::save)
        .then();
    }
    
    private KpiAggregate createKpi(Long sessionId, String metric, Double value, 
                                   LocalDateTime start, LocalDateTime end, String rat) {
        return KpiAggregate.builder()
            .sessionId(sessionId)
            .metric(metric)
            .windowStart(start)
            .windowEnd(end)
            .avgValue(value)
            .minValue(value)
            .maxValue(value)
            .rat(rat)
            .build();
    }
}
```

### Task 3.2: Update CaptureOrchestrationService
**File**: `src/main/java/com/nathan/p2/service/CaptureOrchestrationService.java`

Replace `runKpiCalculation` method:
```java
private Mono<Void> runKpiCalculation(Long sessionId) {
    return sessionService.getSession(sessionId)
        .flatMap(session -> {
            Path pcapFile = Paths.get(session.getSessionDir()).resolve("capture.pcap");
            return kpiCalculatorService.calculateKpis(sessionId, pcapFile);
        });
}
```

**Commit**: `feat(kpi): integrate SCAT KPI calculator with JSON parsing`

---

## Phase 4: Real-time Streaming (1 hour)

### Task 4.1: Add WebSocket Configuration
**File**: `src/main/java/com/nathan/p2/config/WebSocketConfig.java`

```java
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    
    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic");
        config.setApplicationDestinationPrefixes("/app");
    }
    
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
            .setAllowedOrigins("*")
            .withSockJS();
    }
}
```

### Task 4.2: Create Log Streaming Controller
**File**: `src/main/java/com/nathan/p2/controller/LogStreamController.java`

```java
@RestController
@RequestMapping("/api/logs")
@RequiredArgsConstructor
@Slf4j
public class LogStreamController {
    private final CaptureOrchestrationService orchestrationService;
    
    @GetMapping(value = "/sessions/{sessionId}/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> streamLogs(@PathVariable Long sessionId) {
        return orchestrationService.streamLogs(sessionId)
            .map(line -> ServerSentEvent.<String>builder()
                .data(line)
                .build())
            .doOnSubscribe(s -> log.info("Client subscribed to logs for session {}", sessionId))
            .doOnComplete(() -> log.info("Log stream completed for session {}", sessionId))
            .doOnError(e -> log.error("Error streaming logs for session {}", sessionId, e));
    }
}
```

**Commit**: `feat(streaming): add WebSocket and SSE support for real-time log streaming`

---

## Phase 5: GPS Tracking (45 minutes)

### Task 5.1: Create GPS Tracking Service
**File**: `src/main/java/com/nathan/p2/service/GpsTrackingService.java`

```java
@Slf4j
@Service
@RequiredArgsConstructor
public class GpsTrackingService {
    private final ExternalToolService externalToolService;
    private final GpsTraceRepository gpsRepository;
    private final ToolsConfig toolsConfig;
    private final Map<Long, ProcessHandle> activeTrackers = new ConcurrentHashMap<>();
    
    public Mono<Void> startTracking(Long sessionId, String deviceId) {
        log.info("Starting GPS tracking for session {} on device {}", sessionId, deviceId);
        
        Path scriptPath = Paths.get(toolsConfig.getTools().getScat().getPath())
            .getParent()
            .resolve("scripts/adb_gps_tracker.py");
            
        ProcessSpec spec = ProcessSpec.builder()
            .id("gps-" + sessionId)
            .command("python3")
            .args(List.of(scriptPath.toString(), deviceId))
            .workingDirectory(scriptPath.getParent())
            .environment(Map.of())
            .build();
            
        return externalToolService.start(spec)
            .flatMap(handle -> {
                activeTrackers.put(sessionId, handle);
                return parseAndSaveGpsData(sessionId, handle);
            })
            .then();
    }
    
    public Mono<Void> stopTracking(Long sessionId) {
        ProcessHandle handle = activeTrackers.remove(sessionId);
        if (handle == null) {
            return Mono.empty();
        }
        return externalToolService.stop(handle).then();
    }
    
    private Mono<Void> parseAndSaveGpsData(Long sessionId, ProcessHandle handle) {
        return externalToolService.logs(handle)
            .filter(line -> line.startsWith("{"))
            .flatMap(json -> parseGpsJson(sessionId, json))
            .flatMap(gpsRepository::save)
            .then();
    }
    
    private Mono<GpsTrace> parseGpsJson(Long sessionId, String json) {
        return Mono.fromCallable(() -> {
            ObjectMapper mapper = new ObjectMapper();
            JsonNode node = mapper.readTree(json);
            
            return GpsTrace.builder()
                .sessionId(sessionId)
                .timestamp(LocalDateTime.now())
                .latitude(node.path("latitude").asDouble())
                .longitude(node.path("longitude").asDouble())
                .altitude(node.path("altitude").asDouble())
                .accuracy(node.path("accuracy").asDouble())
                .speed(node.path("speed").asDouble())
                .bearing(node.path("bearing").asDouble())
                .build();
        });
    }
}
```

### Task 5.2: Add GPS Controller
**File**: `src/main/java/com/nathan/p2/controller/GpsController.java`

```java
@RestController
@RequestMapping("/api/gps")
@RequiredArgsConstructor
public class GpsController {
    private final GpsTraceRepository gpsRepository;
    
    @GetMapping("/sessions/{sessionId}/traces")
    public Flux<GpsTrace> getGpsTraces(@PathVariable Long sessionId) {
        return gpsRepository.findBySessionIdOrderByTimestampAsc(sessionId);
    }
    
    @GetMapping("/sessions/{sessionId}/geojson")
    public Mono<String> getGeoJson(@PathVariable Long sessionId) {
        return gpsRepository.findBySessionIdOrderByTimestampAsc(sessionId)
            .collectList()
            .map(this::convertToGeoJson);
    }
    
    private String convertToGeoJson(List<GpsTrace> traces) {
        // Convert to GeoJSON LineString format
        StringBuilder sb = new StringBuilder();
        sb.append("{\"type\":\"FeatureCollection\",\"features\":[{");
        sb.append("\"type\":\"Feature\",\"geometry\":{");
        sb.append("\"type\":\"LineString\",\"coordinates\":[");
        
        for (int i = 0; i < traces.size(); i++) {
            GpsTrace trace = traces.get(i);
            sb.append("[").append(trace.getLongitude()).append(",")
              .append(trace.getLatitude()).append("]");
            if (i < traces.size() - 1) sb.append(",");
        }
        
        sb.append("]},\"properties\":{}}]}");
        return sb.toString();
    }
}
```

**Commit**: `feat(gps): add GPS tracking service with ADB integration`

---

## Phase 6: Error Handling & Observability (45 minutes)

### Task 6.1: Create Global Error Handler
**File**: `src/main/java/com/nathan/p2/exception/GlobalExceptionHandler.java`

```java
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {
    
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(IllegalArgumentException ex) {
        log.error("Illegal argument: {}", ex.getMessage());
        return ResponseEntity.badRequest()
            .body(new ErrorResponse("INVALID_ARGUMENT", ex.getMessage()));
    }
    
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ErrorResponse> handleIllegalState(IllegalStateException ex) {
        log.error("Illegal state: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(new ErrorResponse("INVALID_STATE", ex.getMessage()));
    }
    
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneral(Exception ex) {
        log.error("Unexpected error", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(new ErrorResponse("INTERNAL_ERROR", "An unexpected error occurred"));
    }
    
    public record ErrorResponse(String code, String message) {}
}
```

### Task 6.2: Add Sentry Configuration
**File**: `src/main/resources/application.yml`

Update:
```yaml
eca:
  telemetry:
    sentry:
      dsn: ${SENTRY_DSN:}
      enabled: ${SENTRY_ENABLED:false}
      environment: ${SPRING_PROFILES_ACTIVE:development}
      traces-sample-rate: 1.0
```

**Commit**: `feat(observability): add global error handling and Sentry configuration`

---

## Testing Checklist

### Unit Tests
- [ ] SessionService CRUD operations
- [ ] ExternalToolService process management
- [ ] KpiCalculatorService JSON parsing
- [ ] GpsTrackingService coordinate parsing

### Integration Tests
- [ ] Database schema initialization
- [ ] SCAT process spawning and output capture
- [ ] KPI calculation end-to-end
- [ ] WebSocket log streaming
- [ ] GPS tracking with mock ADB

### Manual Tests
- [ ] Connect phone via USB → auto-capture starts
- [ ] View real-time logs in terminal
- [ ] Stop capture → KPIs calculated
- [ ] View KPIs in API response
- [ ] GPS trace visualization

---

## Deployment Checklist

### Prerequisites
- [ ] Java 21 installed
- [ ] Python 3.8+ installed
- [ ] ADB installed and in PATH
- [ ] TShark installed
- [ ] SCAT dependencies installed (`pip install -r requirements.txt`)

### Build
```bash
./mvnw clean package -DskipTests
```

### Run
```bash
java -jar target/p2-0.0.1-SNAPSHOT.jar \
  --eca.tools.scat.path=./scat \
  --eca.tools.adb.path=adb \
  --eca.tools.tshark.path=tshark \
  --eca.storage.base-dir=./data/sessions
```

### Verify
```bash
# Health check
curl http://localhost:8080/actuator/health

# Metrics
curl http://localhost:8080/actuator/prometheus

# Start session
curl -X POST http://localhost:8080/api/sessions/start?deviceId=ABC123

# Stream logs
curl -N http://localhost:8080/api/logs/sessions/1/stream
```

---

## Next Phase: Tauri Integration

After backend completion, proceed to:
1. Initialize Tauri in frontend/
2. Configure Rust backend to spawn Spring Boot
3. Build Windows .exe installer
4. Test end-to-end on Windows

See `TAURI_SETUP.md` for detailed instructions.

---

**End of Backend Implementation Plan**
