package com.shoes.controller;

import com.shoes.domain.model.ShoeProduct;
import com.shoes.service.ShoeCatalogService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/shoes")
public class ShoeController {
    private final ShoeCatalogService catalog;

    public ShoeController(ShoeCatalogService catalog) { this.catalog = catalog; }

    @GetMapping
    public List<ShoeProduct> findAll() { return catalog.findAll(); }

    @GetMapping("/{shoeId}")
    public ShoeProduct findById(@PathVariable String shoeId) { return catalog.findById(shoeId); }
}
