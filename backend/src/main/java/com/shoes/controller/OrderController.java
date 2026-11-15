package com.shoes.controller;

import com.shoes.domain.model.Order;
import com.shoes.domain.model.OrderStatusHistory;
import com.shoes.service.OrderQueryService;
import com.shoes.service.OrderTransactionService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/orders")
public class OrderController {
    private final OrderTransactionService transactions;
    private final OrderQueryService queries;

    public OrderController(OrderTransactionService transactions, OrderQueryService queries) {
        this.transactions = transactions;
        this.queries = queries;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Order create(@Valid @RequestBody CreateOrderRequest request, Authentication authentication) {
        return transactions.create(authentication.getName(), request);
    }

    @GetMapping
    public List<Order> findMine(Authentication authentication) { return queries.findForCustomer(authentication.getName()); }

    @GetMapping("/{orderId}")
    public Order find(@PathVariable String orderId, Authentication authentication) {
        Order order = queries.findById(orderId);
        assertOwnerOrAdmin(order, authentication);
        return order;
    }

    @GetMapping("/{orderId}/history")
    public List<OrderStatusHistory> history(@PathVariable String orderId, Authentication authentication) {
        assertOwnerOrAdmin(queries.findById(orderId), authentication);
        return queries.history(orderId);
    }

    @PostMapping("/{orderId}/pay")
    public Order pay(@PathVariable String orderId, @RequestBody(required = false) PayRequest request,
                     Authentication authentication) {
        assertOwnerOrAdmin(queries.findById(orderId), authentication);
        return transactions.pay(orderId, request == null || request.method() == null ? "DEMO" : request.method());
    }

    @PostMapping("/{orderId}/cancel")
    public Order cancel(@PathVariable String orderId, Authentication authentication) {
        assertOwnerOrAdmin(queries.findById(orderId), authentication);
        return transactions.cancel(orderId);
    }

    private void assertOwnerOrAdmin(Order order, Authentication authentication) {
        boolean admin = authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (!admin && !order.customerId().equals(authentication.getName())) {
            throw new org.springframework.security.access.AccessDeniedException("Order belongs to another customer");
        }
    }

    public record PayRequest(String method) {}
}
