package com.shoes.infrastructure.tikv;

public record KvEntry(String key, byte[] value) {}
