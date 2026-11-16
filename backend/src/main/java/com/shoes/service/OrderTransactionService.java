package com.shoes.service;

import com.shoes.controller.CreateOrderRequest;
import com.shoes.domain.enums.OrderStatus;
import com.shoes.domain.model.Order;
import com.shoes.domain.model.OrderItem;
import com.shoes.domain.model.OrderStatusHistory;
import com.shoes.domain.model.PaymentRecord;
import com.shoes.domain.model.ShoeProduct;
import com.shoes.domain.model.SkuInventory;
import com.shoes.domain.statemachine.OrderStateMachine;
import com.shoes.exception.OutOfStockException;
import com.shoes.exception.ResourceNotFoundException;
import com.shoes.infrastructure.tikv.ConcurrencyConflictException;
import com.shoes.infrastructure.tikv.JsonCodec;
import com.shoes.infrastructure.tikv.KvAtomicWriter;
import com.shoes.infrastructure.tikv.KvReader;
import com.shoes.infrastructure.tikv.TiKVKeyBuilder;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class OrderTransactionService {
    private final KvReader reader;
    private final KvAtomicWriter writer;
    private final ShoeCatalogService catalog;
    private final JsonCodec codec;
    private final OrderStateMachine stateMachine;

    public OrderTransactionService(KvReader reader, KvAtomicWriter writer, ShoeCatalogService catalog,
                                   JsonCodec codec, OrderStateMachine stateMachine) {
        this.reader = reader;
        this.writer = writer;
        this.catalog = catalog;
        this.codec = codec;
        this.stateMachine = stateMachine;
    }

    public Order create(String customerId, CreateOrderRequest request) {
        Instant now = Instant.now();
        String orderId = TiKVKeyBuilder.newOrderId();
        Map<String, byte[]> mutations = new LinkedHashMap<>();
        List<OrderItem> items = new ArrayList<>();
        long total = 0;
        Map<String, CreateOrderRequest.Item> consolidatedItems = new LinkedHashMap<>();
        for (CreateOrderRequest.Item item : request.items()) {
            String sku = TiKVKeyBuilder.inventory(item.shoeId(), item.size(), item.color());
            consolidatedItems.merge(sku, item, (first, next) -> new CreateOrderRequest.Item(
                first.shoeId(), first.size(), first.color(), Math.addExact(first.quantity(), next.quantity())));
        }
        for (CreateOrderRequest.Item requested : consolidatedItems.values()) {
            ShoeProduct product = catalog.findById(requested.shoeId());
            String inventoryKey = TiKVKeyBuilder.inventory(requested.shoeId(), requested.size(), requested.color());
            SkuInventory current = readInventory(inventoryKey);
            if (current.availableQuantity() < requested.quantity()) {
                throw new OutOfStockException("Insufficient stock for " + requested.shoeId());
            }
            SkuInventory reserved = current.reserve(requested.quantity());
            mutations.put(inventoryKey, codec.encode(reserved));
            OrderItem item = new OrderItem(product.shoeId(), product.name(), requested.size(), requested.color(),
                requested.quantity(), product.price());
            items.add(item);
            total = Math.addExact(total, Math.multiplyExact(product.price(), requested.quantity()));
        }
        Order order = new Order(orderId, customerId, List.copyOf(items), total,
            OrderStatus.PENDING_PAYMENT, now, request.shippingAddress());
        mutations.put(TiKVKeyBuilder.order(orderId), codec.encode(order));
        mutations.put(TiKVKeyBuilder.orderStatus(orderId, now.toEpochMilli()),
            codec.encode(new OrderStatusHistory(orderId, order.status(), now, "Order created")));
        mutations.put(TiKVKeyBuilder.customerOrder(customerId, orderId), orderId.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        mutations.put(TiKVKeyBuilder.statusOrder(order.status(), orderId), orderId.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        try {
            writer.writeAtomically(mutations);
        } catch (ConcurrencyConflictException conflict) {
            throw conflict;
        }
        return order;
    }

    public Order pay(String orderId, String method) {
        Order order = loadOrder(orderId);
        requirePendingOwnerStatus(order, OrderStatus.PENDING_PAYMENT);
        stateMachine.validate(order.status(), OrderStatus.PAID);
        Instant now = Instant.now();
        Order paid = order.withStatus(OrderStatus.PAID);
        Map<String, byte[]> mutations = new LinkedHashMap<>();
        for (OrderItem item : order.items()) {
            String key = TiKVKeyBuilder.inventory(item.shoeId(), item.size(), item.color());
            SkuInventory inventory = readInventory(key);
            if (inventory.reservedQuantity() < item.quantity()) throw new ConcurrencyConflictException("Reservation changed");
            mutations.put(key, codec.encode(new SkuInventory(item.shoeId(), item.size(), item.color(),
                inventory.availableQuantity(), inventory.reservedQuantity() - item.quantity())));
        }
        mutations.put(TiKVKeyBuilder.order(orderId), codec.encode(paid));
        String paymentId = UUID.randomUUID().toString();
        mutations.put(TiKVKeyBuilder.payment(paymentId), codec.encode(
            new PaymentRecord(paymentId, orderId, order.totalAmount(), method, now)));
        addStatusMutation(mutations, orderId, paid.status(), now);
        writer.writeAtomically(mutations);
        return paid;
    }

    public Order cancel(String orderId) {
        Order order = loadOrder(orderId);
        stateMachine.validate(order.status(), OrderStatus.CANCELLED);
        Instant now = Instant.now();
        Order cancelled = order.withStatus(OrderStatus.CANCELLED);
        Map<String, byte[]> mutations = new LinkedHashMap<>();
        for (OrderItem item : order.items()) {
            String key = TiKVKeyBuilder.inventory(item.shoeId(), item.size(), item.color());
            SkuInventory inventory = readInventory(key);
            SkuInventory restored;
            if (order.status() == OrderStatus.PENDING_PAYMENT) {
                if (inventory.reservedQuantity() < item.quantity()) throw new ConcurrencyConflictException("Reservation changed");
                restored = inventory.release(item.quantity());
            } else {
                restored = new SkuInventory(item.shoeId(), item.size(), item.color(),
                    inventory.availableQuantity() + item.quantity(), inventory.reservedQuantity());
            }
            mutations.put(key, codec.encode(restored));
        }
        mutations.put(TiKVKeyBuilder.order(orderId), codec.encode(cancelled));
        addStatusMutation(mutations, orderId, cancelled.status(), now);
        writer.writeAtomically(mutations);
        return cancelled;
    }

    public Order advanceStatus(String orderId, OrderStatus nextStatus) {
        if (nextStatus == OrderStatus.PAID || nextStatus == OrderStatus.CANCELLED
            || nextStatus == OrderStatus.PENDING_PAYMENT) {
            throw new IllegalArgumentException("Trạng thái này phải được xử lý bằng thao tác thanh toán hoặc hủy đơn.");
        }
        Order order = loadOrder(orderId);
        stateMachine.validate(order.status(), nextStatus);
        Instant now = Instant.now();
        Order updated = order.withStatus(nextStatus);
        Map<String, byte[]> mutations = new LinkedHashMap<>();
        mutations.put(TiKVKeyBuilder.order(orderId), codec.encode(updated));
        addStatusMutation(mutations, orderId, nextStatus, now);
        writer.writeAtomically(mutations);
        return updated;
    }

    private void addStatusMutation(Map<String, byte[]> mutations, String orderId, OrderStatus status, Instant now) {
        mutations.put(TiKVKeyBuilder.orderStatus(orderId, now.toEpochMilli()),
            codec.encode(new OrderStatusHistory(orderId, status, now, status.name())));
        mutations.put(TiKVKeyBuilder.statusOrder(status, orderId), orderId.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }

    private void requirePendingOwnerStatus(Order order, OrderStatus expected) {
        if (order.status() != expected) throw new IllegalStateException("Order is not awaiting payment");
    }

    private SkuInventory readInventory(String key) {
        return reader.get(key).map(value -> codec.decode(value, SkuInventory.class))
            .orElseThrow(() -> new ResourceNotFoundException("SKU inventory not found"));
    }

    private Order loadOrder(String orderId) {
        return reader.get(TiKVKeyBuilder.order(orderId)).map(value -> codec.decode(value, Order.class))
            .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));
    }
}
