package com.shoes.service;

import com.shoes.domain.enums.OrderStatus;
import com.shoes.domain.model.Order;
import com.shoes.domain.model.OrderStatusHistory;
import com.shoes.exception.ResourceNotFoundException;
import com.shoes.infrastructure.tikv.JsonCodec;
import com.shoes.infrastructure.tikv.KvPrefixScanner;
import com.shoes.infrastructure.tikv.KvReader;
import com.shoes.infrastructure.tikv.TiKVKeyBuilder;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class OrderQueryService {
    private final KvReader reader;
    private final KvPrefixScanner scanner;
    private final JsonCodec codec;

    public OrderQueryService(KvReader reader, KvPrefixScanner scanner, JsonCodec codec) {
        this.reader = reader;
        this.scanner = scanner;
        this.codec = codec;
    }

    public Order findById(String orderId) {
        return reader.get(TiKVKeyBuilder.order(orderId)).map(value -> codec.decode(value, Order.class))
            .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));
    }

    public List<Order> findForCustomer(String customerId) {
        return scanner.scanPrefix("idx:customer:" + customerId + ":order:").stream()
            .map(entry -> new String(entry.value(), java.nio.charset.StandardCharsets.UTF_8))
            .map(this::findById).toList();
    }

    public List<Order> findAll() {
        return scanner.scanPrefix("order:").stream()
            .map(entry -> codec.decode(entry.value(), Order.class)).toList();
    }

    public List<OrderStatusHistory> history(String orderId) {
        findById(orderId);
        return scanner.scanPrefix("order_status:" + orderId + ":").stream()
            .map(entry -> codec.decode(entry.value(), OrderStatusHistory.class))
            .sorted(java.util.Comparator.comparing(OrderStatusHistory::changedAt)).toList();
    }

    public List<Order> findByStatus(OrderStatus status) {
        return scanner.scanPrefix("idx:status:" + status + ":").stream()
            .map(entry -> new String(entry.value(), java.nio.charset.StandardCharsets.UTF_8))
            .map(this::findById).filter(order -> order.status() == status).toList();
    }
}
