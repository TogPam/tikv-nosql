package com.shoes.controller;

import com.shoes.domain.model.SkuInventory;
import com.shoes.service.InventoryService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/inventory")
public class InventoryController {
    private final InventoryService inventory;

    public InventoryController(InventoryService inventory) { this.inventory = inventory; }

    @GetMapping("/{shoeId}/{size}/{color}")
    public SkuInventory get(@PathVariable String shoeId, @PathVariable int size, @PathVariable String color) {
        return inventory.get(shoeId, size, color);
    }

    @GetMapping
    public List<SkuInventory> findAll() { return inventory.findAll(); }
}
