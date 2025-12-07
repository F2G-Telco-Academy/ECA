package com.nathan.p2.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI ecaOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Extended Cellular Analyzer (ECA) API")
                        .description("""
                                # Extended Cellular Analyzer REST API
                                
                                Professional cellular network analyzer that captures UE baseband logs, converts them to PCAP, 
                                analyzes network parameters, and visualizes KPIs.
                                
                                ## Features
                                - **Auto Device Detection**: Automatically detects connected phones via ADB
                                - **Real-time Capture**: Starts capture on device connect, stops on disconnect
                                - **SCAT Integration**: Converts baseband logs (.sdm, .qmdl2) to PCAP
                                - **KPI Analysis**: Comprehensive network performance metrics
                                - **Live Streaming**: Real-time log streaming via Server-Sent Events
                                - **Signaling Analysis**: Protocol message viewer (RRC, NAS, MAC, etc.)
                                
                                ## Supported Technologies
                                - **RATs**: LTE, NR (5G), WCDMA, GSM
                                - **Chipsets**: Qualcomm, Samsung, HiSilicon, Unisoc
                                - **Protocols**: RRC, NAS, PDCP, RLC, MAC, IP
                                
                                ## API Usage
                                1. **Connect Device**: Ensure Android device is connected via USB with ADB debugging enabled
                                2. **Detect Device**: Call GET /api/devices to list connected devices
                                3. **Start Session**: Call POST /api/sessions/start with deviceId
                                4. **Monitor**: Stream logs via GET /api/sessions/{id}/logs (SSE)
                                5. **Analyze**: Access KPIs via GET /api/kpis/session/{id}
                                6. **Stop Session**: Call POST /api/sessions/{id}/stop
                                
                                ## Error Handling
                                All endpoints return standard HTTP status codes:
                                - **200**: Success
                                - **400**: Bad Request (invalid parameters)
                                - **404**: Resource Not Found
                                - **500**: Internal Server Error
                                
                                Error responses include a message field with details.
                                """)
                        .version("0.1.0")
                        .contact(new Contact()
                                .name("ECA Development Team")
                                .email("support@eca.com")
                                .url("https://github.com/F2G-Telco-Academy/ECA"))
                        .license(new License()
                                .name("Proprietary")
                                .url("https://github.com/F2G-Telco-Academy/ECA/blob/main/LICENSE")))
                .servers(List.of(
                        new Server()
                                .url("http://localhost:8080")
                                .description("Local Development Server"),
                        new Server()
                                .url("http://127.0.0.1:8080")
                                .description("Local Development Server (IPv4)")
                ));
    }
}
