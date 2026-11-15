package com.shoes.domain.model;

import com.shoes.domain.enums.OrderStatus;
import java.time.Instant;
import java.util.List;

public record Order(String orderId, String customerId, List<OrderItem> items, long totalAmount,
                    OrderStatus status, Instant createdAt, String shippingAddress) {
    public Order withStatus(OrderStatus next) {
        return new Order(orderId, customerId, items, totalAmount, next, createdAt, shippingAddress);
    }
}
