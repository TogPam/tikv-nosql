package com.shoes.domain.model;

import java.time.Instant;

public record PaymentRecord(String paymentId, String orderId, long amount, String method, Instant paidAt) {}
