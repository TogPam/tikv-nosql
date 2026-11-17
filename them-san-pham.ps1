# ==============================================================================
# SCRIPT THÊM / CẬP NHẬT SẢN PHẨM VÀO CƠ SỞ DỮ LIỆU TIKV
# Bạn có thể tự do chỉnh sửa các thông tin sản phẩm ở phần [BƯỚC 1] bên dưới
# ==============================================================================

# --- [BƯỚC 1: TÙY CHỈNH THÔNG TIN SẢN PHẨM MỚI TẠI ĐÂY] ---
$shoeId       = "SHOE-CONVERSE-70S"             # Mã sản phẩm (duy nhất, viết liền không dấu)
$name         = "Converse Chuck 70 Classic"     # Tên sản phẩm hiển thị
$brand        = "Converse"                      # Hãng sản xuất
$price        = 1850000                         # Giá bán (VNĐ)
$sizes        = @(39, 40, 41, 42)               # Các size giày (mảng số)
$colors       = @("Black", "Parchment")         # Các màu sắc (mảng chuỗi)
$description  = "Giay canvas co dien phong cach Vintage thanh lich."
$imageUrl     = "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=1200"
$initialStock = 12                              # Số lượng tồn kho ban đầu cho mỗi phân loại (size/màu)

# --- [BƯỚC 2: XỬ LÝ LƯU VÀO TIKV QUA API] ---
$baseUrl = "http://localhost:8080"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "      BẮT ĐẦU ĐẨY DỮ LIỆU SẢN PHẨM VÀO CƠ SỞ DỮ LIỆU TIKV        " -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

# 1. Đăng nhập Admin lấy token
Write-Host "[1/3] Đăng nhập tài khoản Quản trị Admin..." -ForegroundColor Yellow
$loginPayload = @{ username = "admin"; password = "123456" } | ConvertTo-Json
try {
    $login = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body $loginPayload
    $headers = @{ "Authorization" = "Bearer $($login.token)" }
    Write-Host " -> Đăng nhập thành công!" -ForegroundColor Green
} catch {
    Write-Host " -> Lỗi kết nối máy chủ backend: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# 2. Đẩy thông tin sản phẩm vào TiKV (Key: product:{shoeId})
Write-Host "[2/3] Lưu sản phẩm '$name' vào TiKV..." -ForegroundColor Yellow
$productObj = @{
    shoeId      = $shoeId
    name        = $name
    brand       = $brand
    price       = $price
    sizes       = $sizes
    colors      = $colors
    description = $description
    imageUrl    = $imageUrl
}
$productJson = $productObj | ConvertTo-Json -Depth 4
$productBytes = [System.Text.Encoding]::UTF8.GetBytes($productJson)

try {
    # Thử tạo mới sản phẩm (POST)
    $created = Invoke-RestMethod -Uri "$baseUrl/api/admin/products" -Method Post -Headers $headers -ContentType "application/json; charset=utf-8" -Body $productBytes
    Write-Host " -> [TẠO MỚI] Đã tạo Key thành công: product:$shoeId" -ForegroundColor Green
} catch {
    # Nếu sản phẩm đã tồn tại, tự động chuyển sang Cập nhật (PUT)
    try {
        $created = Invoke-RestMethod -Uri "$baseUrl/api/admin/products/$shoeId" -Method Put -Headers $headers -ContentType "application/json; charset=utf-8" -Body $productBytes
        Write-Host " -> [CẬP NHẬT] Đã cập nhật thành công Key: product:$shoeId" -ForegroundColor Green
    } catch {
        Write-Host " -> Lỗi lưu sản phẩm: $($_.Exception.Message)" -ForegroundColor Red
        exit
    }
}

# 3. Khởi tạo tồn kho cho từng mã SKU (Key: inv:{shoeId}:{size}:{color})
Write-Host "[3/3] Khởi tạo tồn kho ($initialStock đôi cho mỗi phân loại SKU)..." -ForegroundColor Yellow
$totalSkuCount = 0
foreach ($s in $sizes) {
    foreach ($c in $colors) {
        $invPayload = @{
            availableQuantity = $initialStock
            reservedQuantity  = 0
        } | ConvertTo-Json
        
        $encodedColor = [System.Uri]::EscapeDataString($c)
        $invUrl = "$baseUrl/api/admin/inventory/$shoeId/$s/$encodedColor"
        
        $null = Invoke-RestMethod -Uri $invUrl -Method Put -Headers $headers -ContentType "application/json" -Body $invPayload
        $totalSkuCount++
    }
}
Write-Host " -> Đã lưu thành công $totalSkuCount mã SKU tồn kho (Key: inv:$($shoeId):...)!" -ForegroundColor Green

# 4. Hiển thị tổng kết kết quả
Write-Host ""
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host " ĐẨY DỮ LIỆU THÀNH CÔNG VÀO CƠ SỞ DỮ LIỆU TIKV!                   " -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host " - Mã Key sản phẩm   : product:$($created.shoeId)" -ForegroundColor White
Write-Host " - Tên sản phẩm      : $($created.name)" -ForegroundColor White
Write-Host " - Hãng / Brand      : $($created.brand)" -ForegroundColor White
Write-Host " - Giá niêm yết      : $([string]::Format('{0:N0}', $created.price)) VNĐ" -ForegroundColor White
Write-Host " - Các Size mở bán   : $($created.sizes -join ', ')" -ForegroundColor White
Write-Host " - Các Màu sắc       : $($created.colors -join ', ')" -ForegroundColor White
Write-Host " - Số lượng tồn kho  : $initialStock đôi / SKU (Tổng kho: $($totalSkuCount * $initialStock) đôi)" -ForegroundColor White
Write-Host ""
Write-Host "👉 KIỂM TRA NGAY TRÊN GIAO DIỆN:" -ForegroundColor Yellow
Write-Host " 1. Web Cửa hàng  : http://localhost:5173/ (Sản phẩm xuất hiện ngay)" -ForegroundColor White
Write-Host " 2. Web Quản trị  : http://localhost:5173/admin (Xem và sửa tồn kho)" -ForegroundColor White
Write-Host " 3. API Danh mục  : http://localhost:8080/api/shoes" -ForegroundColor White
Write-Host "==================================================================" -ForegroundColor Cyan
