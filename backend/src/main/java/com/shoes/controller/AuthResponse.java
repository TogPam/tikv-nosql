package com.shoes.controller;

import java.util.List;

public record AuthResponse(String token, String username, List<String> roles) {}
