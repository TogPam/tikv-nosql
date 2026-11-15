package com.shoes.infrastructure.tikv;

import java.util.List;

public interface KvPrefixScanner {
    List<KvEntry> scanPrefix(String prefix);
}
