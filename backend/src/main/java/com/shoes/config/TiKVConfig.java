package com.shoes.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.tikv.common.TiConfiguration;
import org.tikv.common.TiSession;

@Configuration
public class TiKVConfig {
    @Bean(destroyMethod = "close")
    public TiSession tiSession(@Value("${tikv.pd.endpoints}") String pdEndpoints) {
        return TiSession.create(TiConfiguration.createDefault(pdEndpoints));
    }
}
