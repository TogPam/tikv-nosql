package com.shoes.domain.model;

public record SkuInventory(String shoeId, int size, String color,
                           int availableQuantity, int reservedQuantity) {
    public SkuInventory reserve(int quantity) {
        if (quantity <= 0 || availableQuantity < quantity) {
            throw new IllegalStateException("Insufficient inventory");
        }
        return new SkuInventory(shoeId, size, color, availableQuantity - quantity, reservedQuantity + quantity);
    }

    public SkuInventory release(int quantity) {
        if (quantity <= 0 || reservedQuantity < quantity) {
            throw new IllegalStateException("Invalid inventory release");
        }
        return new SkuInventory(shoeId, size, color, availableQuantity + quantity, reservedQuantity - quantity);
    }
}
