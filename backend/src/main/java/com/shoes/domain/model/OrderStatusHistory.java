package com.shoes.domain.model;

import com.shoes.domain.enums.OrderStatus;
import java.time.Instant;

public record OrderStatusHistory(String orderId, OrderStatus status, Instant changedAt, String note) {}
