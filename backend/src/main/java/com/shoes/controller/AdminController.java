package com.shoes.controller;

import com.shoes.domain.enums.OrderStatus;
import com.shoes.domain.model.Order;
import com.shoes.domain.model.SkuInventory;
import com.shoes.service.InventoryService;
import com.shoes.service.OrderQueryService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final InventoryService inventory;
    private final OrderQueryService orders;

    public AdminController(InventoryService inventory, OrderQueryService orders) {
        this.inventory = inventory;
        this.orders = orders;
    }

    @GetMapping("/orders")
    public List<Order> allOrders(@RequestParam(required = false) OrderStatus status) {
        return status == null ? orders.findAll() : orders.findByStatus(status);
    }

    @GetMapping("/inventory")
    public List<SkuInventory> allInventory() { return inventory.findAll(); }

    @PutMapping("/inventory/{shoeId}/{size}/{color}")
    public SkuInventory updateInventory(@PathVariable String shoeId, @PathVariable int size,
                                        @PathVariable String color, @Valid @RequestBody UpdateInventoryRequest request) {
        return inventory.update(shoeId, size, color, new SkuInventory(shoeId, size, color,
            request.availableQuantity(), request.reservedQuantity()));
    }
}
