package com.shoes.controller;

import com.shoes.domain.enums.OrderStatus;
import com.shoes.domain.model.Order;
import com.shoes.domain.model.SkuInventory;
import com.shoes.domain.model.ShoeProduct;
import com.shoes.service.InventoryService;
import com.shoes.service.OrderQueryService;
import com.shoes.service.OrderTransactionService;
import com.shoes.service.ShoeCatalogService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final InventoryService inventory;
    private final OrderQueryService orders;
    private final OrderTransactionService orderTransactions;
    private final ShoeCatalogService catalog;

    public AdminController(InventoryService inventory, OrderQueryService orders,
                           OrderTransactionService orderTransactions, ShoeCatalogService catalog) {
        this.inventory = inventory;
        this.orders = orders;
        this.orderTransactions = orderTransactions;
        this.catalog = catalog;
    }

    @GetMapping("/products")
    public List<ShoeProduct> allProducts() { return catalog.findAll(); }

    @PostMapping("/products")
    public ShoeProduct createProduct(@Valid @RequestBody ShoeProduct product) { return catalog.save(product, true); }

    @PutMapping("/products/{shoeId}")
    public ShoeProduct updateProduct(@PathVariable String shoeId, @Valid @RequestBody ShoeProduct product) {
        if (!shoeId.equals(product.shoeId())) throw new IllegalArgumentException("Mã sản phẩm trên URL và nội dung không khớp.");
        return catalog.save(product, false);
    }

    @GetMapping("/orders")
    public List<Order> allOrders(@RequestParam(required = false) OrderStatus status) {
        return status == null ? orders.findAll() : orders.findByStatus(status);
    }

    @PutMapping("/orders/{orderId}/status")
    public Order updateOrderStatus(@PathVariable String orderId, @RequestBody UpdateOrderStatusRequest request) {
        if (request.status() == OrderStatus.PAID) return orderTransactions.pay(orderId, "ADMIN_CONFIRMED");
        if (request.status() == OrderStatus.CANCELLED) return orderTransactions.cancel(orderId);
        return orderTransactions.advanceStatus(orderId, request.status());
    }

    @GetMapping("/inventory")
    public List<SkuInventory> allInventory() { return inventory.findAll(); }

    @PutMapping("/inventory/{shoeId}/{size}/{color}")
    public SkuInventory updateInventory(@PathVariable String shoeId, @PathVariable int size,
                                        @PathVariable String color, @Valid @RequestBody UpdateInventoryRequest request) {
        return inventory.update(shoeId, size, color, new SkuInventory(shoeId, size, color,
            request.availableQuantity(), request.reservedQuantity()));
    }

    public record UpdateOrderStatusRequest(OrderStatus status) {}
}
