package com.nathan.p2;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.data.r2dbc.repository.config.EnableR2dbcRepositories;

@SpringBootApplication
@EnableR2dbcRepositories
@ConfigurationPropertiesScan
public class P2Application {

    public static void main(String[] args) {
        SpringApplication.run(P2Application.class, args);
    }

}
