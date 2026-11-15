package com.shoes.infrastructure.tikv;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class JsonCodec {
    private static final Logger logger = LoggerFactory.getLogger(JsonCodec.class);
    private final ObjectMapper objectMapper;

    public JsonCodec(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public byte[] encode(Object value) {
        try {
            return objectMapper.writeValueAsBytes(value);
        } catch (Exception exception) {
            throw new IllegalStateException("Could not encode value", exception);
        }
    }

    public <T> T decode(byte[] value, Class<T> type) {
        try {
            return objectMapper.readValue(value, type);
        } catch (Exception exception) {
            logger.error("Failed to decode TiKV value as {}", type.getName(), exception);
            throw new IllegalStateException("Could not decode value", exception);
        }
    }
}
