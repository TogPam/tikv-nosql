package com.shoes.domain.statemachine;

import com.shoes.domain.enums.OrderStatus;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
public class OrderStateMachine {
    private final Map<OrderStatus, Set<OrderStatus>> transitions = new EnumMap<>(OrderStatus.class);

    public OrderStateMachine() {
        transitions.put(OrderStatus.PENDING_PAYMENT, EnumSet.of(OrderStatus.PAID, OrderStatus.CANCELLED));
        transitions.put(OrderStatus.PAID, EnumSet.of(OrderStatus.PROCESSING, OrderStatus.CANCELLED));
        transitions.put(OrderStatus.PROCESSING, EnumSet.of(OrderStatus.SHIPPING, OrderStatus.CANCELLED));
        transitions.put(OrderStatus.SHIPPING, EnumSet.of(OrderStatus.DELIVERED));
        transitions.put(OrderStatus.DELIVERED, EnumSet.noneOf(OrderStatus.class));
        transitions.put(OrderStatus.CANCELLED, EnumSet.noneOf(OrderStatus.class));
    }

    public void validate(OrderStatus current, OrderStatus next) {
        if (!transitions.getOrDefault(current, EnumSet.noneOf(OrderStatus.class)).contains(next)) {
            throw new IllegalStateException("Invalid order transition: " + current + " -> " + next);
        }
    }
}
