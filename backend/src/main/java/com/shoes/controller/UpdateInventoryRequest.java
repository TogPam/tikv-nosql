package com.shoes.controller;

import jakarta.validation.constraints.Min;

public record UpdateInventoryRequest(@Min(0) int availableQuantity, @Min(0) int reservedQuantity) {}
