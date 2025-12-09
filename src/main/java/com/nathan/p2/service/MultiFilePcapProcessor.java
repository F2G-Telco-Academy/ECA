package com.nathan.p2.service;

import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.nio.file.Path;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MultiFilePcapProcessor {
    
    private final ComprehensivePcapExtractorService pcapExtractor;

    public Mono<MergedDataset> processMultipleFiles(List<Path> pcapFiles) {
        return Flux.fromIterable(pcapFiles)
            .flatMap(path -> pcapExtractor.extractCompleteDataset(path)
                .map(data -> new TaggedDataset(path.getFileName().toString(), data))
                .onErrorResume(e -> {
                    log.error("Failed to process {}: {}", path, e.getMessage());
                    return Mono.empty();
                }))
            .collectList()
            .map(this::mergeDatasets);
    }

    private MergedDataset mergeDatasets(List<TaggedDataset> datasets) {
        List<Map<String, Object>> merged = new ArrayList<>();
        Map<String, Integer> fileCounts = new HashMap<>();
        
        for (TaggedDataset dataset : datasets) {
            String source = dataset.getSource();
            fileCounts.put(source, dataset.getData().size());
            
            for (Map<String, Object> row : dataset.getData()) {
                Map<String, Object> tagged = new HashMap<>(row);
                tagged.put("source_file", source);
                merged.add(tagged);
            }
        }
        
        log.info("Merged {} files with {} total points", datasets.size(), merged.size());
        return new MergedDataset(merged, fileCounts);
    }

    @Data
    private static class TaggedDataset {
        private final String source;
        private final List<Map<String, Object>> data;
    }

    @Data
    public static class MergedDataset {
        private final List<Map<String, Object>> data;
        private final Map<String, Integer> fileCounts;
    }
}
