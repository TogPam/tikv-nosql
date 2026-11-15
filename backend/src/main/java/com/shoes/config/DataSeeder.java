package com.shoes.config;

import com.shoes.domain.model.ShoeProduct;
import com.shoes.domain.model.SkuInventory;
import com.shoes.infrastructure.tikv.JsonCodec;
import com.shoes.infrastructure.tikv.KvAtomicWriter;
import com.shoes.infrastructure.tikv.KvReader;
import com.shoes.infrastructure.tikv.TiKVKeyBuilder;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {
    private final KvReader reader;
    private final KvAtomicWriter writer;
    private final JsonCodec codec;

    public DataSeeder(KvReader reader, KvAtomicWriter writer, JsonCodec codec) {
        this.reader = reader;
        this.writer = writer;
        this.codec = codec;
    }

    @Override
    public void run(String... args) {
        int attempts = 30;
        long delayMs = 1000L;

        for (int attempt = 1; attempt <= attempts; attempt++) {
            try {
                if (reader.get(TiKVKeyBuilder.product("SHOE-NIKE-AJ1")).isPresent()) return;
                List<ShoeProduct> products = List.of(
                    new ShoeProduct("SHOE-NIKE-AJ1", "Nike Air Jordan 1 Low", "Nike", 3500000,
                        List.of(39, 40, 41, 42, 43), List.of("Black/White", "Chicago Red"),
                        "A court classic with a low-cut profile and premium leather finish.",
                        "https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=1200&q=85"),
                    new ShoeProduct("SHOE-ADIDAS-UB", "Adidas Ultraboost Light", "Adidas", 4200000,
                        List.of(38, 39, 40, 41, 42), List.of("Core Black", "Cloud White"),
                        "Responsive cushioning and a breathable knit upper for everyday miles.",
                        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=85"),
                    new ShoeProduct("SHOE-PUMA-SUEDE", "Puma Suede Classic XXI", "Puma", 2100000,
                        List.of(39, 40, 41, 42), List.of("Puma Black", "Navy"),
                        "The timeless suede profile, grounded in a durable rubber sole.",
                        "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=1200&q=85"),
                    new ShoeProduct("SHOE-LIMITED-01", "Nike Travis Scott Limited Drop", "Nike", 8900000,
                        List.of(41), List.of("BLACK"), "A one-pair limited release.",
                        "https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=1200&q=85")
                );
                Map<String, byte[]> mutations = new LinkedHashMap<>();
                for (ShoeProduct product : products) {
                    mutations.put(TiKVKeyBuilder.product(product.shoeId()), codec.encode(product));
                    int quantity = product.shoeId().equals("SHOE-LIMITED-01") ? 1
                        : product.shoeId().equals("SHOE-NIKE-AJ1") ? 15
                        : product.shoeId().equals("SHOE-ADIDAS-UB") ? 10 : 12;
                    for (int size : product.sizes()) {
                        for (String color : product.colors()) {
                            mutations.put(TiKVKeyBuilder.inventory(product.shoeId(), size, color),
                                codec.encode(new SkuInventory(product.shoeId(), size, color, quantity, 0)));
                        }
                    }
                }
                writer.writeAtomically(mutations);
                return;
            } catch (Exception ex) {
                if (attempt == attempts) {
                    throw new IllegalStateException("TiKV seed data initialization failed after retries", ex);
                }
                try {
                    Thread.sleep(delayMs);
                } catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();
                    throw new IllegalStateException("TiKV seed initialization interrupted", interrupted);
                }
            }
        }
    }
}
