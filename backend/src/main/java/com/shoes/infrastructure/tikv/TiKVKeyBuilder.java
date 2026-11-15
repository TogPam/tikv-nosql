package com.shoes.infrastructure.tikv;

import com.shoes.domain.enums.OrderStatus;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

public final class TiKVKeyBuilder {
    private TiKVKeyBuilder() {}

    public static String product(String shoeId) { return "product:" + shoeId; }
    public static String inventory(String shoeId, int size, String color) {
        return "inv:" + shoeId + ":" + size + ":" + color;
    }
    public static String order(String orderId) { return "order:" + orderId; }
    public static String orderStatus(String orderId, long epochMillis) {
        return "order_status:" + orderId + ":" + epochMillis;
    }
    public static String payment(String paymentId) { return "payment:" + paymentId; }
    public static String customerOrder(String customerId, String orderId) {
        return "idx:customer:" + customerId + ":order:" + orderId;
    }
    public static String statusOrder(OrderStatus status, String orderId) {
        return "idx:status:" + status + ":" + orderId;
    }
    public static String brandShoe(String brand, String shoeId) {
        return "idx:brand:" + brand.toLowerCase() + ":" + shoeId;
    }
    public static String newOrderId() {
        String day = LocalDate.now(ZoneOffset.UTC).format(DateTimeFormatter.BASIC_ISO_DATE);
        return "ORD-" + day + "-" + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
    }

    public static byte[] prefixEnd(String prefix) {
        byte[] end = prefix.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        for (int index = end.length - 1; index >= 0; index--) {
            if ((end[index] & 0xff) != 0xff) {
                end[index]++;
                return java.util.Arrays.copyOf(end, index + 1);
            }
        }
        return new byte[0];
    }
}
