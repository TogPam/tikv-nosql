package com.shoes.domain.model;

import java.util.List;

public record ShoeProduct(String shoeId, String name, String brand, long price,
                          List<Integer> sizes, List<String> colors, String description,
                          String imageUrl) {}
