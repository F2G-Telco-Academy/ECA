package com.nathan.p2.service.process;

import lombok.Builder;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

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
