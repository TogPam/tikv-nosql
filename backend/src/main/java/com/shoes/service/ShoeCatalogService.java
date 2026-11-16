package com.shoes.service;

import com.shoes.domain.model.ShoeProduct;
import com.shoes.exception.ResourceNotFoundException;
import com.shoes.infrastructure.tikv.JsonCodec;
import com.shoes.infrastructure.tikv.KvAtomicWriter;
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
    private final KvAtomicWriter writer;

    public ShoeCatalogService(KvReader reader, KvPrefixScanner scanner, JsonCodec codec, KvAtomicWriter writer) {
        this.reader = reader;
        this.scanner = scanner;
        this.codec = codec;
        this.writer = writer;
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

    public ShoeProduct save(ShoeProduct product, boolean createOnly) {
        if (product.shoeId() == null || product.shoeId().isBlank() || product.name() == null || product.name().isBlank()
            || product.brand() == null || product.brand().isBlank() || product.price() <= 0
            || product.sizes() == null || product.sizes().isEmpty() || product.colors() == null || product.colors().isEmpty()) {
            throw new IllegalArgumentException("Thông tin sản phẩm không hợp lệ.");
        }
        String productKey = TiKVKeyBuilder.product(product.shoeId());
        boolean exists = reader.get(productKey).isPresent();
        if (createOnly && exists) throw new IllegalStateException("Mã sản phẩm đã tồn tại.");
        if (!createOnly && !exists) throw new ResourceNotFoundException("Không tìm thấy sản phẩm: " + product.shoeId());

        java.util.Map<String, byte[]> mutations = new java.util.LinkedHashMap<>();
        mutations.put(productKey, codec.encode(product));
        for (int size : product.sizes()) {
            for (String color : product.colors()) {
                String inventoryKey = TiKVKeyBuilder.inventory(product.shoeId(), size, color);
                if (reader.get(inventoryKey).isEmpty()) {
                    mutations.put(inventoryKey, codec.encode(new com.shoes.domain.model.SkuInventory(
                        product.shoeId(), size, color, 0, 0)));
                }
            }
        }
        writer.writeAtomically(mutations);
        return product;
    }
}
