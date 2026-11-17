# ==============================================================================
# DEMO GIẢ LẬP DÒNG CHẢY GIAO DỊCH THƯƠNG MẠI ĐIỆN TỬ THỜI GIAN THỰC (LIVE TRAFFIC)
# Mô phỏng: Khách hàng mua sắm, đặt hàng, thanh toán và hủy đơn liên tục theo thời gian thực
# Mục đích: Phục vụ trình diễn trước hội đồng, làm sống động Web Admin và TiKV Dashboard
# ==============================================================================

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "   GIẢ LẬP DÒNG CHẢY GIAO DỊCH E-COMMERCE & ĐƠN HÀNG THỜI GIAN THỰC" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

$baseUrl = "http://localhost:8080"

# 1. Đăng nhập
Write-Host "-> Đang kết nối và lấy xác thực bảo mật..." -ForegroundColor Gray
$login = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body '{"username":"togpam","password":"123456"}'
$headers = @{ "Authorization" = "Bearer $($login.token)"; "Content-Type" = "application/json" }

# Danh sách sản phẩm để random mua sắm
$shoes = @(
    @{ id = "SHOE-ADIDAS-UB"; name = "Adidas Ultraboost Light"; size = 40; color = "Core Black" },
    @{ id = "SHOE-NIKE-AJ1";   name = "Nike Air Jordan 1 Low";  size = 41; color = "Chicago Red" },
    @{ id = "SHOE-PUMA-SUEDE"; name = "Puma Suede Classic XXI"; size = 39; color = "Navy" }
)

$addresses = @(
    "123 Nguyen Trai, Thanh Xuan, Ha Noi",
    "45 Le Loi, Quan 1, TP. Ho Chi Minh",
    "78 Tran Phu, Hai Chau, Da Nang",
    "12 Pham Van Dong, Cau Giay, Ha Noi",
    "89 Nguyen Hue, Quan 1, TP. Ho Chi Minh"
)

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Green
Write-Host " BẮT ĐẦU CHẠY GIẢ LẬP (Mỗi chu kỳ khoảng 2 giây)..." -ForegroundColor White
Write-Host " Mở trình duyệt song song để quan sát:" -ForegroundColor Yellow
Write-Host "  1. Web Quản trị Admin: http://localhost:5173/admin" -ForegroundColor White
Write-Host "  2. TiKV Dashboard:     http://localhost:2379/dashboard" -ForegroundColor White
Write-Host "  (Nhấn tổ hợp phím Ctrl + C để dừng giả lập bất kỳ lúc nào)" -ForegroundColor DarkGray
Write-Host "==================================================================" -ForegroundColor Green
Write-Host ""

$cycle = 1
$maxCycles = 15 # Mặc định chạy 15 chu kỳ để trình bày (khoảng 30 giây)

while ($cycle -le $maxCycles) {
    $timeStr = (Get-Date).ToString("HH:mm:ss")
    $chosenShoe = $shoes | Get-Random
    $chosenAddr = $addresses | Get-Random

    Write-Host "[$timeStr] [Chu kỳ $cycle/$maxCycles] " -NoNewline -ForegroundColor Cyan
    
    # Bước 1: Khách hàng xem danh mục & tồn kho (Tạo lưu lượng Read Traffic)
    $null = Invoke-RestMethod -Uri "$baseUrl/api/shoes"
    $null = Invoke-RestMethod -Uri "$baseUrl/api/inventory/$($chosenShoe.id)/$($chosenShoe.size)/$($chosenShoe.color)"

    # Bước 2: Tạo đơn hàng mới (Tạo lưu lượng Write Traffic - 2PC Transaction)
    $orderBody = @{
        shippingAddress = $chosenAddr
        items = @(
            @{
                shoeId   = $chosenShoe.id
                size     = $chosenShoe.size
                color    = $chosenShoe.color
                quantity = 1
            }
        )
    } | ConvertTo-Json -Depth 3

    try {
        $order = Invoke-RestMethod -Uri "$baseUrl/api/orders" -Method Post -Headers $headers -Body $orderBody
        Write-Host "ĐẶT HÀNG: $($order.orderId) - $($chosenShoe.name) " -ForegroundColor Yellow

        # Bước 3: Random hành vi tiếp theo (80% Thanh toán, 20% Hủy đơn)
        Start-Sleep -Milliseconds 800
        $randAction = Get-Random -Minimum 1 -Maximum 10

        if ($randAction -le 7) {
            # Thanh toán đơn hàng
            $payBody = @{ method = "VIETQR_DEMO" } | ConvertTo-Json
            $paid = Invoke-RestMethod -Uri "$baseUrl/api/orders/$($order.orderId)/pay" -Method Post -Headers $headers -Body $payBody
            Write-Host "             ---> [THANH TOÁN THÀNH CÔNG] TiKV cập nhật trạng thái PAID & Trừ kho chính thức!" -ForegroundColor Green
        } else {
            # Hủy đơn hàng
            $cancelled = Invoke-RestMethod -Uri "$baseUrl/api/orders/$($order.orderId)/cancel" -Method Post -Headers $headers
            Write-Host "             ---> [HỦY ĐƠN HÀNG] TiKV hoàn trả tồn kho reservedQuantity -> availableQuantity!" -ForegroundColor Red
        }
    } catch {
        Write-Host "Giao dịch bị từ chối: $($_.Exception.Message)" -ForegroundColor DarkRed
    }

    $cycle++
    Start-Sleep -Seconds 1
}

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host " GIẢ LẬP HOÀN TẤT! HÃY KIỂM TRA TRÊN WEB ADMIN & TIKV DASHBOARD:   " -ForegroundColor Cyan
Write-Host " 1. Web Admin: http://localhost:5173/admin -> Các đơn hàng mới xuất hiện" -ForegroundColor White
Write-Host " 2. TiKV Dashboard: Key Visualizer đang ghi nhận các dải nhiệt mới!" -ForegroundColor White
Write-Host "==================================================================" -ForegroundColor Cyan
