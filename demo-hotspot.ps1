# Demo script: Kích hoạt lưu lượng đọc/ghi trên TiKV để làm sáng biểu đồ nhiệt (Key Visualizer)
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " BAT DAU TAO LUU LUONG DOC/GHI DE KIEM TRA TIKV DASHBOARD " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$baseUrl = "http://localhost:8080"

# 1. Dang nhap lay JWT token
Write-Host "[1/3] Dang nhap tai khoan test..." -ForegroundColor Yellow
$loginPayload = @{ username = "togpam"; password = "123456" } | ConvertTo-Json
$login = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body $loginPayload
$headers = @{ 
    "Authorization" = "Bearer $($login.token)"
    "Content-Type" = "application/json" 
}
Write-Host " -> Dang nhap thanh cong! Token: $($login.token.Substring(0, 20))..." -ForegroundColor Green

# 2. Chay vong lap doc du lieu lien tuc (Read Traffic)
Write-Host "[2/3] Dang gui 60 yeu cau doc lien tuc (Read Traffic)..." -ForegroundColor Yellow
for ($i = 1; $i -le 60; $i++) {
    $null = Invoke-RestMethod -Uri "$baseUrl/api/shoes"
    $null = Invoke-RestMethod -Uri "$baseUrl/api/inventory"
    Write-Host "." -NoNewline -ForegroundColor DarkGray
    if ($i % 20 -eq 0) { Write-Host " ($i/60)" -ForegroundColor Gray }
}
Write-Host ""
Write-Host " -> Da tao thanh cong 120 luot doc tren cac Region TiKV!" -ForegroundColor Green

# 3. Tao don hang moi (Write Traffic qua giao dich 2PC)
Write-Host "[3/3] Tao giao dich dat hang va thanh toan (Write Traffic)..." -ForegroundColor Yellow
$orderPayload = @{
    shippingAddress = "Quan Cam, Ha Noi - Demo Heatmap"
    items = @(
        @{
            shoeId = "SHOE-PUMA-SUEDE"
            size = 40
            color = "Navy"
            quantity = 1
        }
    )
} | ConvertTo-Json -Depth 4

$newOrder = Invoke-RestMethod -Uri "$baseUrl/api/orders" -Method Post -Headers $headers -Body $orderPayload
Write-Host " -> Da tao don hang thanh cong: $($newOrder.orderId)" -ForegroundColor Green

# Thanh toan don hang de tao giao dich ghi vao order_status & payment
$payPayload = @{ method = "VIETQR_DEMO" } | ConvertTo-Json
$paidOrder = Invoke-RestMethod -Uri "$baseUrl/api/orders/$($newOrder.orderId)/pay" -Method Post -Headers $headers -Body $payPayload
Write-Host " -> Da thanh toan thanh cong! Trang thai: $($paidOrder.status)" -ForegroundColor Green

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " HOAN TAT! HAY MO TIKV DASHBOARD DE KIEM TRA HEATMAP:     " -ForegroundColor Cyan
Write-Host " 1. Mo trinh duyet vao: http://localhost:2379/dashboard    " -ForegroundColor White
Write-Host " 2. Chon muc 'Key Visualizer'                             " -ForegroundColor White
Write-Host " 3. Chon 'Recent 30 min' va nhan Refresh de thay vet sang " -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan
