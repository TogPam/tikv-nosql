package com.shoes.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;

public record CreateOrderRequest(@NotBlank String shippingAddress, @Size(min = 1) List<@Valid Item> items) {
    public record Item(@NotBlank String shoeId, @Positive int size, @NotBlank String color, @Positive int quantity) {}
}
