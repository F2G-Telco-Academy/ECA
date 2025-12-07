package com.nathan.p2.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

@Data
@Configuration
@ConfigurationProperties(prefix = "eca")
public class ToolsConfig {
    private Tools tools = new Tools();
    private Storage storage = new Storage();
    private Device device = new Device();
    
    @Data
    public static class Tools {
        private Tool scat = new Tool();
        private Tool termshark = new Tool();
        private Tool mobileinsight = new Tool();
        private Tool adb = new Tool();
        private Tool tshark = new Tool();
    }
    
    @Data
    public static class Tool {
        private String path;
        private String pythonPath = "python3";
    }
    
    @Data
    public static class Storage {
        private String baseDir = "./data/sessions";
    }
    
    @Data
    public static class Device {
        private Duration detectionInterval = Duration.ofSeconds(3);
    }
}
