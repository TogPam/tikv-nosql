package com.shoes.service;

import com.shoes.domain.model.SkuInventory;
import com.shoes.exception.ResourceNotFoundException;
import com.shoes.infrastructure.tikv.JsonCodec;
import com.shoes.infrastructure.tikv.KvAtomicWriter;
import com.shoes.infrastructure.tikv.KvPrefixScanner;
import com.shoes.infrastructure.tikv.KvReader;
import com.shoes.infrastructure.tikv.TiKVKeyBuilder;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class InventoryService {
    private final KvReader reader;
    private final KvPrefixScanner scanner;
    private final KvAtomicWriter writer;
    private final JsonCodec codec;

    public InventoryService(KvReader reader, KvPrefixScanner scanner, KvAtomicWriter writer, JsonCodec codec) {
        this.reader = reader;
        this.scanner = scanner;
        this.writer = writer;
        this.codec = codec;
    }

    public SkuInventory get(String shoeId, int size, String color) {
        return reader.get(TiKVKeyBuilder.inventory(shoeId, size, color))
            .map(value -> codec.decode(value, SkuInventory.class))
            .orElseThrow(() -> new ResourceNotFoundException("SKU inventory not found"));
    }

    public List<SkuInventory> findAll() {
        return scanner.scanPrefix("inv:").stream()
            .map(entry -> codec.decode(entry.value(), SkuInventory.class)).toList();
    }

    public SkuInventory update(String shoeId, int size, String color, SkuInventory inventory) {
        if (!inventory.shoeId().equals(shoeId) || inventory.size() != size || !inventory.color().equals(color)) {
            throw new IllegalArgumentException("SKU path and payload do not match");
        }
        writer.writeAtomically(Map.of(TiKVKeyBuilder.inventory(shoeId, size, color), codec.encode(inventory)));
        return inventory;
    }
}
