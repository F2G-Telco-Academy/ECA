package com.nathan.p2.controller;

import com.nathan.p2.service.QualcommDMParserService;
import com.nathan.p2.service.SessionService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.nio.file.Paths;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/qualcomm")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Tag(name = "Qualcomm DM Messages", description = "Qualcomm diagnostic message parsing")
public class QualcommDMController {

    private final QualcommDMParserService parserService;
    private final SessionService sessionService;

    @GetMapping(value = "/session/{sessionId}/dm-messages", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<Map<String, Object>> streamDMMessages(@PathVariable Long sessionId) {
        return sessionService.getSession(sessionId)
            .flatMapMany(session -> {
                String qmdlPath = session.getSessionDir() + "/diag.qmdl2";
                return parserService.parseDMMessages(Paths.get(qmdlPath));
            });
    }
}
