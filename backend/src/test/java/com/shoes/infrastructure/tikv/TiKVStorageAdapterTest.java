package com.shoes.infrastructure.tikv;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;

class TiKVStorageAdapterTest {
    @Test
    void prepareSecondaryKeysOrdersKeysDeterministically() {
        Map<String, byte[]> mutations = new LinkedHashMap<>();
        mutations.put("product:SHOE-NEW-TEST", "product".getBytes());
        mutations.put("inv:SHOE-NEW-TEST:40:Trắng", "inv-40".getBytes());
        mutations.put("inv:SHOE-NEW-TEST:39:Đen", "inv-39".getBytes());

        assertThat(TiKVStorageAdapter.prepareSecondaryKeys("product:SHOE-NEW-TEST", mutations))
            .containsExactly("inv:SHOE-NEW-TEST:39:Đen", "inv:SHOE-NEW-TEST:40:Trắng");
    }

    @Test
    void nextCommitTsStaysStrictlyAfterStartTs() {
        assertThat(TiKVStorageAdapter.nextCommitTs(100L, 100L)).isEqualTo(101L);
        assertThat(TiKVStorageAdapter.nextCommitTs(100L, 200L)).isEqualTo(200L);
    }
}
