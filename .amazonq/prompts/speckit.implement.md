# Extended Cellular Analyzer - Implementation Guide

## Current Implementation Status

### ✅ Sprint 1 - MVP (COMPLETE)

All core features have been implemented and tested. The system is production-ready for local deployment.

---

## Implementation Architecture

### Backend Structure
```
src/main/java/com/nathan/p2/
├── controller/          # REST API endpoints
│   ├── DeviceController.java
│   ├── SessionController.java
│   ├── KpiController.java
│   ├── RecordController.java
│   ├── MapDataController.java
│   ├── AnomalyController.java
│   └── ArtifactController.java
├── service/             # Business logic
│   ├── DeviceDetectorService.java
│   ├── SessionService.java
│   ├── KpiService.java
│   ├── RecordService.java
│   ├── CaptureOrchestrationService.java
│   └── ExternalToolService.java
├── repository/          # Data access
│   ├── SessionRepository.java
│   ├── KpiAggregateRepository.java
│   ├── RecordRepository.java
│   ├── AnomalyRepository.java
│   └── GpsTraceRepository.java
├── domain/              # Entities
│   ├── Session.java
│   ├── KpiAggregate.java
│   ├── Record.java
│   ├── Anomaly.java
│   └── GpsTrace.java
├── dto/                 # Data transfer objects
│   ├── DeviceDto.java
│   ├── KpiDataDto.java
│   ├── RecordDto.java
│   └── PaginatedResponse.java
├── config/              # Configuration
│   └── ToolsConfig.java
└── util/                # Utilities
    └── PlatformUtils.java
```

### Frontend Structure
```
frontend/src/
├── components/          # React components
│   ├── ModularDashboard.tsx
│   ├── XCALRFSummary.tsx
│   ├── XCALSignalingViewer.tsx
│   ├── XCALGraphView.tsx
│   ├── EnhancedTerminal.tsx
│   ├── MapView.tsx
│   ├── SessionControlPanel.tsx
│   └── MultiDeviceGrid.tsx
├── pages/               # Next.js pages
│   ├── index.tsx
│   ├── xcal.tsx
│   └── _app.tsx
├── utils/               # Utilities
│   └── api.ts
└── types/               # TypeScript types
    └── index.ts
```

---

## How to Implement New Features

### Adding a New Backend Endpoint

#### 1. Create DTO
```java
// src/main/java/com/nathan/p2/dto/NewFeatureDto.java
package com.nathan.p2.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NewFeatureDto {
    private Long id;
    private String name;
    // Add fields
}
```

#### 2. Create Domain Entity (if needed)
```java
// src/main/java/com/nathan/p2/domain/NewFeature.java
package com.nathan.p2.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("new_features")
public class NewFeature {
    @Id
    private Long id;
    private String name;
    // Add fields
}
```

#### 3. Create Repository
```java
// src/main/java/com/nathan/p2/repository/NewFeatureRepository.java
package com.nathan.p2.repository;

import com.nathan.p2.domain.NewFeature;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;

@Repository
public interface NewFeatureRepository extends ReactiveCrudRepository<NewFeature, Long> {
    Flux<NewFeature> findByName(String name);
}
```

#### 4. Create Service
```java
// src/main/java/com/nathan/p2/service/NewFeatureService.java
package com.nathan.p2.service;

import com.nathan.p2.dto.NewFeatureDto;
import com.nathan.p2.repository.NewFeatureRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

@Slf4j
@Service
@RequiredArgsConstructor
public class NewFeatureService {
    
    private final NewFeatureRepository repository;

    public Mono<NewFeatureDto> getFeature(Long id) {
        return repository.findById(id)
                .map(this::toDto);
    }

    private NewFeatureDto toDto(NewFeature entity) {
        return NewFeatureDto.builder()
                .id(entity.getId())
                .name(entity.getName())
                .build();
    }
}
```

#### 5. Create Controller
```java
// src/main/java/com/nathan/p2/controller/NewFeatureController.java
package com.nathan.p2.controller;

import com.nathan.p2.dto.NewFeatureDto;
import com.nathan.p2.service.NewFeatureService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

/**
 * REST controller for new feature operations.
 */
@Slf4j
@RestController
@RequestMapping("/api/new-features")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class NewFeatureController {
    
    private final NewFeatureService service;

    @GetMapping("/{id}")
    public Mono<NewFeatureDto> getFeature(@PathVariable Long id) {
        log.debug("Fetching feature: {}", id);
        return service.getFeature(id);
    }
}
```

#### 6. Update Database Schema
```sql
-- src/main/resources/schema.sql
CREATE TABLE IF NOT EXISTS new_features (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_new_features_name ON new_features(name);
```

### Adding a New Frontend Component

#### 1. Create Component
```typescript
// frontend/src/components/NewFeature.tsx
import { useState, useEffect } from 'react'
import { api } from '@/utils/api'

interface NewFeatureProps {
  featureId: string
}

export default function NewFeature({ featureId }: NewFeatureProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await api.getNewFeature(featureId)
        setData(result)
      } catch (error) {
        console.error('Failed to fetch feature:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [featureId])

  if (loading) return <div>Loading...</div>

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold">{data?.name}</h2>
      {/* Add content */}
    </div>
  )
}
```

#### 2. Add API Method
```typescript
// frontend/src/utils/api.ts
export const api = {
  // ... existing methods

  async getNewFeature(id: string): Promise<NewFeature> {
    const res = await fetch(`${API_BASE}/new-features/${id}`)
    if (!res.ok) throw new Error('Failed to fetch feature')
    return res.json()
  }
}
```

#### 3. Add TypeScript Type
```typescript
// frontend/src/types/index.ts
export interface NewFeature {
  id: string
  name: string
  // Add fields
}
```

---

## Sprint 2 Implementation Guide

### Report Generation

#### Backend Implementation
```java
// 1. Create ReportController
@RestController
@RequestMapping("/api/reports")
public class ReportController {
    
    @PostMapping("/{sessionId}/generate")
    public Mono<Void> generateReport(
            @PathVariable Long sessionId,
            @RequestParam(defaultValue = "PDF") String format) {
        return reportService.generateReport(sessionId, format);
    }
}

// 2. Create ReportService
@Service
public class ReportService {
    
    public Mono<Void> generateReport(Long sessionId, String format) {
        return switch (format) {
            case "PDF" -> generatePdfReport(sessionId);
            case "HTML" -> generateHtmlReport(sessionId);
            case "CSV" -> generateCsvReport(sessionId);
            default -> Mono.error(new IllegalArgumentException("Invalid format"));
        };
    }
}
```

#### Frontend Implementation
```typescript
// Add to api.ts
async generateReport(sessionId: number, format: 'PDF' | 'HTML' | 'CSV'): Promise<void> {
  const res = await fetch(`${API_BASE}/reports/${sessionId}/generate?format=${format}`, {
    method: 'POST'
  })
  if (!res.ok) throw new Error('Failed to generate report')
}
```

### Authentication

#### Backend Implementation
```java
// 1. Add Spring Security dependency to pom.xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>

// 2. Create SecurityConfig
@Configuration
@EnableWebFluxSecurity
public class SecurityConfig {
    
    @Bean
    public SecurityWebFilterChain securityWebFilterChain(ServerHttpSecurity http) {
        return http
                .csrf().disable()
                .authorizeExchange()
                .pathMatchers("/api/auth/**").permitAll()
                .anyExchange().authenticated()
                .and()
                .oauth2ResourceServer()
                .jwt()
                .and()
                .and()
                .build();
    }
}

// 3. Create AuthController
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    
    @PostMapping("/login")
    public Mono<TokenResponse> login(@RequestBody LoginRequest request) {
        return authService.authenticate(request);
    }
}
```

### Multi-Device Support

#### Backend Implementation
```java
// 1. Update SessionService
@Service
public class SessionService {
    
    public Flux<Session> startMultipleSessions(List<String> deviceIds) {
        return Flux.fromIterable(deviceIds)
                .flatMap(deviceId -> captureService.startCapture(deviceId));
    }
}

// 2. Create MultiSessionController
@RestController
@RequestMapping("/api/multi-sessions")
public class MultiSessionController {
    
    @PostMapping("/start")
    public Flux<Session> startMultipleSessions(@RequestBody List<String> deviceIds) {
        return sessionService.startMultipleSessions(deviceIds);
    }
}
```

---

## Testing Guidelines

### Backend Unit Tests
```java
@SpringBootTest
class NewFeatureServiceTest {
    
    @Autowired
    private NewFeatureService service;
    
    @MockBean
    private NewFeatureRepository repository;
    
    @Test
    void shouldGetFeature() {
        // Given
        NewFeature feature = NewFeature.builder()
                .id(1L)
                .name("Test")
                .build();
        
        when(repository.findById(1L))
                .thenReturn(Mono.just(feature));
        
        // When
        NewFeatureDto result = service.getFeature(1L).block();
        
        // Then
        assertNotNull(result);
        assertEquals("Test", result.getName());
    }
}
```

### Frontend Component Tests
```typescript
import { render, screen } from '@testing-library/react'
import NewFeature from '@/components/NewFeature'

describe('NewFeature', () => {
  it('renders feature name', async () => {
    render(<NewFeature featureId="1" />)
    
    const name = await screen.findByText('Test Feature')
    expect(name).toBeInTheDocument()
  })
})
```

---

## Deployment Guide

### Development
```bash
# Backend
./mvnw spring-boot:run

# Frontend
cd frontend && npm run dev
```

### Production Build
```bash
# Backend JAR
./mvnw clean package
java -jar target/p2-0.0.1-SNAPSHOT.jar

# Frontend Desktop App
cd frontend
npm run tauri:build
```

### Docker Deployment (Sprint 3)
```bash
# Build images
docker build -t eca-backend .
docker build -t eca-frontend ./frontend

# Run with Docker Compose
docker-compose up -d
```

---

## Best Practices

### Code Quality
- Use Lombok to reduce boilerplate
- Write comprehensive JavaDoc
- Follow reactive programming patterns
- Handle errors gracefully
- Log at appropriate levels

### Performance
- Use pagination for large datasets
- Add database indexes
- Implement caching where appropriate
- Use reactive streams for backpressure

### Security
- Validate all inputs
- Sanitize user data
- Use parameterized queries
- Implement rate limiting
- Enable CORS properly

### Testing
- Write unit tests for all services
- Write integration tests for APIs
- Test error scenarios
- Maintain 80%+ coverage

---

**Status:** Implementation Guide Complete ✅  
**Last Updated:** 2025-12-07  
**Next:** Sprint 2 Implementation
