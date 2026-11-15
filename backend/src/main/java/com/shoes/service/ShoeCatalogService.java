package com.shoes.service;

import com.shoes.domain.model.ShoeProduct;
import com.shoes.exception.ResourceNotFoundException;
import com.shoes.infrastructure.tikv.JsonCodec;
import com.shoes.infrastructure.tikv.KvPrefixScanner;
import com.shoes.infrastructure.tikv.KvReader;
import com.shoes.infrastructure.tikv.TiKVKeyBuilder;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ShoeCatalogService {
    private final KvReader reader;
    private final KvPrefixScanner scanner;
    private final JsonCodec codec;

    public ShoeCatalogService(KvReader reader, KvPrefixScanner scanner, JsonCodec codec) {
        this.reader = reader;
        this.scanner = scanner;
        this.codec = codec;
    }

    public List<ShoeProduct> findAll() {
        return scanner.scanPrefix("product:").stream()
            .map(entry -> codec.decode(entry.value(), ShoeProduct.class)).toList();
    }

    public ShoeProduct findById(String shoeId) {
        return reader.get(TiKVKeyBuilder.product(shoeId))
            .map(value -> codec.decode(value, ShoeProduct.class))
            .orElseThrow(() -> new ResourceNotFoundException("Shoe not found: " + shoeId));
    }
}
