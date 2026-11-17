# ==============================================================================
# DEMO GIẢ LẬP FLASH SALE: TRANH MUA HÀNG ĐỒNG THỜI (CONCURRENCY & RACE CONDITION)
# Chứng minh: Tính toàn vẹn giao dịch phân tán 2PC trên TiKV ngăn chặn bán quá số lượng (Overselling)
# ==============================================================================

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "     GIẢ LẬP KỊCH BẢN FLASH SALE - TRANH MUA HÀNG ĐỒNG THỜI       " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

$baseUrl = "http://localhost:8080"
$shoeId = "SHOE-LIMITED-01"
$size = 41
$color = "BLACK"
$initialStock = 2
$totalBuyers = 6

# 1. Đăng nhập
Write-Host "[1/4] Đăng nhập tài khoản kiểm thử..." -ForegroundColor Yellow
$login = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body '{"username":"togpam","password":"123456"}'
$token = $login.token

# 2. Reset kho ban đầu về 2 đôi
Write-Host "[2/4] Thiết lập kho cho $shoeId (Size $size, Màu $color) = $initialStock đôi..." -ForegroundColor Yellow
$adminLogin = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body '{"username":"admin","password":"123456"}'
$adminHeaders = @{ "Authorization" = "Bearer $($adminLogin.token)"; "Content-Type" = "application/json" }
$updatePayload = @{ availableQuantity = $initialStock; reservedQuantity = 0 } | ConvertTo-Json
$null = Invoke-RestMethod -Uri "$baseUrl/api/admin/inventory/$shoeId/$size/$color" -Method Put -Headers $adminHeaders -Body $updatePayload

$stockBefore = Invoke-RestMethod -Uri "$baseUrl/api/inventory/$shoeId/$size/$color"
Write-Host " -> Số lượng có sẵn trong kho ban đầu: $($stockBefore.availableQuantity) đôi." -ForegroundColor Green

# 3. Kích hoạt đồng thời 6 khách hàng tranh mua trong cùng 1 thời điểm
Write-Host "[3/4] Bắt đầu kích hoạt $totalBuyers khách hàng cùng bấm Đặt hàng đồng thời..." -ForegroundColor Yellow

$jobs = @()
for ($i = 1; $i -le $totalBuyers; $i++) {
    $jobs += Start-Job -ScriptBlock {
        param($u, $tok, $idx, $sId, $sz, $cl)
        $h = @{ "Authorization" = "Bearer $tok"; "Content-Type" = "application/json" }
        $b = '{"shippingAddress":"Địa chỉ khách ' + $idx + '","items":[{"shoeId":"' + $sId + '","size":' + $sz + ',"color":"' + $cl + '","quantity":1}]}'
        try {
            $r = Invoke-RestMethod -Uri "$u/api/orders" -Method Post -Headers $h -Body $b
            [PSCustomObject]@{
                KhachHang = "Khách hàng #$idx"
                KetQua    = "THÀNH CÔNG"
                MaDonHang = $r.orderId
                GhiChu    = "Đã khóa và giữ kho thành công"
            }
        } catch {
            [PSCustomObject]@{
                KhachHang = "Khách hàng #$idx"
                KetQua    = "BỊ TỪ CHỐI"
                MaDonHang = "N/A"
                GhiChu    = "Hết hàng / Xung đột giao dịch TiKV 2PC (409)"
            }
        }
    } -ArgumentList $baseUrl, $token, $i, $shoeId, $size, $color
}

Write-Host " -> Đang chờ các luồng giao dịch 2PC phản hồi từ TiKV..." -ForegroundColor Gray
$rawResults = $jobs | Wait-Job | Receive-Job
$jobs | Remove-Job

# 4. Hiển thị bảng tổng kết
Write-Host ""
Write-Host "[4/4] BẢNG TỔNG KẾT KẾT QUẢ GIAO DỊCH ĐỒNG THỜI:" -ForegroundColor Yellow
$rawResults | Select-Object KhachHang, KetQua, MaDonHang, GhiChu | Format-Table -AutoSize

$successCount = ($rawResults | Where-Object { $_.KetQua -eq "THÀNH CÔNG" }).Count
$rejectedCount = ($rawResults | Where-Object { $_.KetQua -ne "THÀNH CÔNG" }).Count

$stockAfter = Invoke-RestMethod -Uri "$baseUrl/api/inventory/$shoeId/$size/$color"

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " KẾT LUẬN KIỂM CHỨNG BẢO VỆ ĐỒ ÁN:" -ForegroundColor White
Write-Host " - Số lượng mở bán ban đầu : $initialStock đôi" -ForegroundColor White
Write-Host " - Số yêu cầu tranh mua     : $totalBuyers yêu cầu đồng thời" -ForegroundColor White
Write-Host " - Số đơn chốt THÀNH CÔNG   : $successCount đơn" -ForegroundColor Green
Write-Host " - Số đơn BỊ TỪ CHỐI        : $rejectedCount đơn" -ForegroundColor Red
Write-Host " - Tồn kho còn lại trong DB : $($stockAfter.availableQuantity) đôi (Đang tạm giữ: $($stockAfter.reservedQuantity))" -ForegroundColor Cyan
Write-Host ""
if ($successCount -eq $initialStock -and $stockAfter.availableQuantity -eq 0) {
    Write-Host " => KẾT QUẢ: TUYỆT ĐỐI KHÔNG BỊ OVERSELLING (BÁN QUÁ SỐ LƯỢNG)!" -ForegroundColor Green
    Write-Host "    Thuật toán 2PC (Two-Phase Commit) của TiKV đã tự động khóa Key" -ForegroundColor Green
    Write-Host "    và bảo vệ tính toàn vẹn (ACID Isolation) của dữ liệu!" -ForegroundColor Green
}
Write-Host "=================================================================" -ForegroundColor Cyan
