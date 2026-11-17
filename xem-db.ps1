# ==============================================================================
# SCRIPT XEM TOÀN BỘ CƠ SỞ DỮ LIỆU TIKV (KEY-VALUE VIEWER)
# ==============================================================================

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "         TRÌNH XEM DỮ LIỆU CƠ SỞ DỮ LIỆU TIKV (KEY-VALUE)         " -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

$baseUrl = "http://localhost:8080"

# 1. Đăng nhập
$login = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body '{"username":"admin","password":"123456"}'
$headers = @{ "Authorization" = "Bearer $($login.token)"; "Content-Type" = "application/json" }

# 2. Xem Bảng Sản phẩm (product:*)
Write-Host ""
Write-Host "--- [1] BẢNG SẢN PHẨM (Key: product:{shoeId}) ---" -ForegroundColor Yellow
$shoes = Invoke-RestMethod -Uri "$baseUrl/api/shoes"
$shoes | ForEach-Object {
    [PSCustomObject]@{
        Key        = "product:$($_.shoeId)"
        TenGiay    = $_.name
        ThuongHieu = $_.brand
        GiaTien    = "$([string]::Format('{0:N0}', $_.price)) d"
        Sizes      = ($_.sizes -join ", ")
        MauSac     = ($_.colors -join ", ")
    }
} | Format-Table -AutoSize

# 3. Xem Bảng Tồn kho SKU (inv:*)
Write-Host ""
Write-Host "--- [2] BẢNG TỒN KHO SKU (Key: inv:{shoeId}:{size}:{color}) ---" -ForegroundColor Yellow
$inventory = Invoke-RestMethod -Uri "$baseUrl/api/inventory"
Write-Host " (Tổng cộng: $($inventory.Count) mã SKU đang lưu trong TiKV)" -ForegroundColor Gray
$inventory | Select-Object -First 10 | ForEach-Object {
    [PSCustomObject]@{
        Key               = "inv:$($_.shoeId):$($_.size):$($_.color)"
        CoTheBan_Available = $_.availableQuantity
        DangGiu_Reserved  = $_.reservedQuantity
    }
} | Format-Table -AutoSize
if ($inventory.Count -gt 10) {
    Write-Host " ... va $($inventory.Count - 10) ma SKU khac." -ForegroundColor DarkGray
}

# 4. Xem Bảng Đơn hàng (order:*)
Write-Host ""
Write-Host "--- [3] BẢNG ĐƠN HÀNG & GIAO DỊCH (Key: order:{orderId}) ---" -ForegroundColor Yellow
$orders = Invoke-RestMethod -Uri "$baseUrl/api/admin/orders" -Headers $headers
if ($orders.Count -eq 0) {
    Write-Host " Chưa có đơn hàng nào." -ForegroundColor DarkGray
} else {
    Write-Host " (Tổng cộng: $($orders.Count) đơn hàng trong CSDL TiKV)" -ForegroundColor Gray
    $orders | Select-Object -First 8 | ForEach-Object {
        $itemSummary = ($_.items | ForEach-Object { "$($_.shoeName) (Sz $($_.size), SL $($_.quantity))" }) -join "; "
        [PSCustomObject]@{
            Key          = "order:$($_.orderId)"
            KhachHang    = $_.customerId
            TrangThai    = $_.status
            TongTien     = "$([string]::Format('{0:N0}', $_.totalAmount)) d"
            ChiTietHang  = $itemSummary
        }
    } | Format-Table -AutoSize
}

# 5. Xem Lịch sử trạng thái của đơn hàng gần nhất (order_status:*)
if ($orders.Count -gt 0) {
    $latestOrder = $orders[0]
    Write-Host ""
    Write-Host "--- [4] NHẬT KÝ TRẠNG THÁI (Key: order_status:$($latestOrder.orderId):{timestamp}) ---" -ForegroundColor Yellow
    try {
        $history = Invoke-RestMethod -Uri "$baseUrl/api/orders/$($latestOrder.orderId)/history" -Headers $headers
        $history | ForEach-Object {
            [PSCustomObject]@{
                DonHang   = $_.orderId
                TrangThai = $_.status
                ThoiDiem  = $_.changedAt
                GhiChu    = $_.note
            }
        } | Format-Table -AutoSize
    } catch {
        Write-Host " Khong the lay lich su trang thai: $($_.Exception.Message)" -ForegroundColor DarkGray
    }
}

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host " CÁC CÁCH XEM TRÊN TRÌNH DUYỆT (GIAO DIỆN TRỰC QUAN):             " -ForegroundColor Cyan
Write-Host " 1. Web Quản trị Admin: http://localhost:5173/admin              " -ForegroundColor White
Write-Host " 2. TiKV Dashboard:     http://localhost:2379/dashboard          " -ForegroundColor White
Write-Host " 3. Swagger JSON:       http://localhost:8080/swagger-ui/index.html" -ForegroundColor White
Write-Host "==================================================================" -ForegroundColor Cyan
