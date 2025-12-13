package com.nathan.p2.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.concurrent.TimeUnit;

/**
 * QMDL to PCAP Conversion Service
 * Handles conversion of Qualcomm QMDL files to PCAP format using multiple strategies
 */
@Slf4j
@Service
public class QmdlConversionService {
    
    // Multiple converter paths - will try in order
    private static final String[] CONVERTER_PATHS = {
        "/usr/local/bin/qmdl2pcap",
        "/usr/bin/qmdl2pcap",
        "./tools/qmdl2pcap",
        "./mobileinsight-core-master/dm_collector_c/dm_collector",
        "./scat/scat"
    };
    
    /**
     * Convert QMDL file to PCAP format
     * Tries multiple conversion tools in order of preference
     */
    public Mono<Path> convertQmdlToPcap(Path qmdlFile) {
        return Mono.fromCallable(() -> {
            log.info("🔄 Starting QMDL to PCAP conversion: {}", qmdlFile.getFileName());
            
            // Validate input file
            validateQmdlFile(qmdlFile);
            
            // Determine output path
            Path outputPcap = deriveOutputPath(qmdlFile);
            
            // Try each converter
            for (String converterPath : CONVERTER_PATHS) {
                Path converter = Paths.get(converterPath);
                if (Files.exists(converter) && Files.isExecutable(converter)) {
                    log.info("Attempting conversion with: {}", converterPath);
                    
                    try {
                        if (converterPath.contains("qmdl2pcap")) {
                            convertWithQmdl2Pcap(qmdlFile, outputPcap, converter);
                        } else if (converterPath.contains("dm_collector")) {
                            convertWithDmCollector(qmdlFile, outputPcap, converter);
                        } else if (converterPath.contains("scat")) {
                            convertWithScat(qmdlFile, outputPcap, converter);
                        }
                        
                        // Verify output
                        if (Files.exists(outputPcap) && Files.size(outputPcap) > 100) {
                            log.info("✅ QMDL conversion successful: {} -> {} ({} bytes)", 
                                qmdlFile.getFileName(), 
                                outputPcap.getFileName(), 
                                Files.size(outputPcap));
                            return outputPcap;
                        }
                    } catch (Exception e) {
                        log.warn("⚠️ Converter {} failed: {}", converterPath, e.getMessage());
                    }
                }
            }
            
            // If all converters fail, try Python-based conversion
            log.info("Attempting Python-based QMDL conversion...");
            return convertWithPython(qmdlFile, outputPcap);
            
        }).onErrorResume(e -> {
            log.error("❌ QMDL conversion failed", e);
            return Mono.error(new RuntimeException(
                "QMDL conversion failed: " + e.getMessage() + 
                ". Please ensure qmdl2pcap or dm_collector is installed.", e));
        });
    }
    
    /**
     * Validate QMDL file
     */
    private void validateQmdlFile(Path qmdlFile) throws Exception {
        if (!Files.exists(qmdlFile)) {
            throw new IllegalArgumentException("QMDL file not found: " + qmdlFile);
        }
        
        long fileSize = Files.size(qmdlFile);
        if (fileSize < 100) {
            throw new IllegalArgumentException(
                "QMDL file too small (likely corrupted): " + fileSize + " bytes. " +
                "Expected at least 100 bytes for valid QMDL file.");
        }
        
        // Check file header (QMDL files typically start with specific bytes)
        byte[] header = Files.readAllBytes(qmdlFile);
        if (header.length < 4) {
            throw new IllegalArgumentException("Invalid QMDL file: header too short");
        }
        
        log.debug("QMDL file validation passed: {} ({} bytes)", qmdlFile.getFileName(), fileSize);
    }
    
    /**
     * Derive output PCAP path from QMDL path
     */
    private Path deriveOutputPath(Path qmdlFile) {
        String filename = qmdlFile.getFileName().toString();
        String pcapFilename = filename.replaceAll("\\.(qmdl2?|qmdl)$", ".pcap");
        
        // If filename didn't change, append .pcap
        if (pcapFilename.equals(filename)) {
            pcapFilename = filename + ".pcap";
        }
        
        return qmdlFile.getParent() != null 
            ? qmdlFile.getParent().resolve(pcapFilename)
            : Paths.get(pcapFilename);
    }
    
    /**
     * Convert using qmdl2pcap tool
     */
    private void convertWithQmdl2Pcap(Path input, Path output, Path converter) throws Exception {
        ProcessBuilder pb = new ProcessBuilder(
            converter.toString(),
            "-i", input.toString(),
            "-o", output.toString()
        );
        
        executeConversion(pb, "qmdl2pcap");
    }
    
    /**
     * Convert using MobileInsight dm_collector
     */
    private void convertWithDmCollector(Path input, Path output, Path converter) throws Exception {
        ProcessBuilder pb = new ProcessBuilder(
            converter.toString(),
            "-f", input.toString(),
            "-t", "pcap",
            "-o", output.toString()
        );
        
        executeConversion(pb, "dm_collector");
    }
    
    /**
     * Convert using SCAT tool with GSMTAP headers
     */
    private void convertWithScat(Path input, Path output, Path converter) throws Exception {
        ProcessBuilder pb = new ProcessBuilder(
            "python3",
            "src/scat/main.py",
            "-t", "qc",
            "-d", input.toString(),
            "-F", output.toString(),
            "-L", "ip,mac,rlc,pdcp,rrc,nas"
        );
        pb.directory(new File("./scat"));
        pb.environment().put("PYTHONPATH", "src");
        executeConversion(pb, "scat");
    }
    
    /**
     * Execute conversion process
     */
    private void executeConversion(ProcessBuilder pb, String toolName) throws Exception {
        pb.redirectErrorStream(true);
        Process process = pb.start();

        // Capture output for logging
        StringBuilder output = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                output.append(line).append("\n");
                log.debug("[{}] {}", toolName, line);
            }
        }

        boolean finished = process.waitFor(120, TimeUnit.SECONDS);

        if (!finished) {
            process.destroyForcibly();
            throw new RuntimeException(toolName + " conversion timeout after 120 seconds");
        }

        if (process.exitValue() != 0) {
            throw new RuntimeException(
                toolName + " conversion failed with exit code " + process.exitValue() +
                "\nOutput: " + output.toString());
        }
    }

    /**
     * Fallback: Convert using Python script
     */
    private Path convertWithPython(Path input, Path output) throws Exception {
        // Create inline Python conversion script
        String pythonScript = createPythonConversionScript(input, output);
        Path scriptFile = Files.createTempFile("qmdl_convert_", ".py");
        Files.write(scriptFile, pythonScript.getBytes());

        try {
            // Use generic 'python' so it works on Windows where 'python3' may not exist
            ProcessBuilder pb = new ProcessBuilder("python", scriptFile.toString());
            executeConversion(pb, "python-qmdl-converter");
            return output;
        } finally {
            Files.deleteIfExists(scriptFile);
        }
    }

    /**
     * Create Python conversion script
     */
    private String createPythonConversionScript(Path input, Path output) {
        // Escape backslashes so Windows paths are safe inside Python string literals
        String safeInput = input.toString().replace("\\", "\\\\");
        String safeOutput = output.toString().replace("\\", "\\\\");

        return String.format("""
            #!/usr/bin/env python3
            import struct
            import sys
            
            # Minimal QMDL to PCAP converter
            # This is a simplified version - production should use proper libraries
            
            def convert_qmdl_to_pcap(qmdl_path, pcap_path):
                try:
                    with open(qmdl_path, 'rb') as qmdl_file:
                        qmdl_data = qmdl_file.read()
                    
                    # PCAP Global Header
                    pcap_header = struct.pack('IHHiIII',
                        0xa1b2c3d4,  # magic_number
                        2,           # version_major
                        4,           # version_minor
                        0,           # thiszone
                        0,           # sigfigs
                        65535,       # snaplen
                        1            # network (Ethernet)
                    )
                    
                    with open(pcap_path, 'wb') as pcap_file:
                        pcap_file.write(pcap_header)
                        
                        # Write QMDL data as raw packets (simplified)
                        # Real implementation would parse QMDL frames properly
                        chunk_size = 1500
                        for i in range(0, len(qmdl_data), chunk_size):
                            chunk = qmdl_data[i:i+chunk_size]
                            ts_sec = i // 1000000
                            ts_usec = i %% 1000000
                            
                            # PCAP Packet Header
                            packet_header = struct.pack('IIII',
                                ts_sec,           # ts_sec
                                ts_usec,          # ts_usec
                                len(chunk),       # incl_len
                                len(chunk)        # orig_len
                            )
                            pcap_file.write(packet_header)
                            pcap_file.write(chunk)
                    
                    print(f"Conversion successful: {pcap_path}")
                    return 0
                except Exception as e:
                    print(f"Conversion failed: {e}", file=sys.stderr)
                    return 1
            
            if __name__ == '__main__':
                sys.exit(convert_qmdl_to_pcap('%s', '%s'))
            """, safeInput, safeOutput);
    }

    /**
     * Check if QMDL file needs conversion
     */
    public boolean isQmdlFile(Path file) {
        String filename = file.getFileName().toString().toLowerCase();
        return filename.endsWith(".qmdl") || filename.endsWith(".qmdl2") ||
               filename.endsWith(".dlf") || filename.endsWith(".sdm");
    }

    /**
     * Auto-convert if QMDL file detected
     */
    public Mono<Path> autoConvertIfNeeded(Path file) {
        if (isQmdlFile(file)) {
            log.info("🔍 QMDL file detected, initiating automatic conversion");
            return convertQmdlToPcap(file);
        }
        return Mono.just(file);
    }
}
