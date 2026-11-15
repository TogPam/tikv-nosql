package com.shoes.domain.model;

public record OrderItem(String shoeId, String shoeName, int size, String color, int quantity, long unitPrice) {}
