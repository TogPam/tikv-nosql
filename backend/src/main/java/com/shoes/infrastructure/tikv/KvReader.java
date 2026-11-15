package com.shoes.infrastructure.tikv;

import java.util.Optional;

public interface KvReader {
    Optional<byte[]> get(String key);
}
