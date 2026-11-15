#!/usr/bin/env python3
"""Concurrent one-unit limited-SKU test for the shoe store API."""

import concurrent.futures
import json
import os
import sys
import urllib.error
import urllib.request

BASE_URL = os.environ.get("SHOE_STORE_URL", "http://localhost:8080/api").rstrip("/")


def request_json(path, method="GET", payload=None, token=None):
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(f"{BASE_URL}{path}", data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            data = response.read()
            return response.status, json.loads(data) if data else None
    except urllib.error.HTTPError as error:
        data = error.read()
        try:
            payload = json.loads(data) if data else None
        except json.JSONDecodeError:
            payload = None
        return error.code, payload


def main():
    try:
        login_status, login = request_json("/auth/login", "POST", {"username": "togpam", "password": "123456"})
        if login_status != 200 or not login or not login.get("token"):
            raise RuntimeError(f"Login failed with HTTP {login_status}: {login}")
        token = login["token"]
        order_payload = {
            "shippingAddress": "1 Test Street, Ho Chi Minh City",
            "items": [{"shoeId": "SHOE-LIMITED-01", "size": 41, "color": "BLACK", "quantity": 1}],
        }

        def place_order(_):
            status, _ = request_json("/orders", "POST", order_payload, token)
            return status

        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:
            statuses = list(pool.map(place_order, range(10)))

        created = statuses.count(201)
        conflicts = statuses.count(409)
        stock_status, stock = request_json("/inventory/SHOE-LIMITED-01/41/BLACK")
        available = stock.get("availableQuantity") if stock_status == 200 and stock else None
        print(f"Order responses: 201={created}, 409={conflicts}, all={statuses}")
        print(f"Limited SKU availableQuantity: {available}")
        if created != 1 or conflicts != 9 or available != 0:
            return 1
        print("Overselling check passed.")
        return 0
    except (OSError, RuntimeError, ValueError) as error:
        print(f"Overselling check failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
