package com.shoes.infrastructure.tikv;

import java.util.Map;

public interface KvAtomicWriter {
    void writeAtomically(Map<String, byte[]> mutations);
}
