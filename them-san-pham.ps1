# ==============================================================================
# SCRIPT THEM / CAP NHAT SAN PHAM VAO CO SO DU LIEU TIKV
# Ban co the tuy chinh thong tin san pham o phan [BUOC 1] ben duoi
# ==============================================================================

# --- [BUOC 1: TUY CHINH THONG TIN SAN PHAM TAI DAY] ---
$shoeId       = "SHOE-CONVERSE-70S"             # Ma san pham (duy nhat, viet lien khong dau)
$name         = "Converse Chuck 70 Classic"     # Ten san pham hien thi
$brand        = "Converse"                      # Hang san xuat
$price        = 1850000                         # Gia ban (VND)
$sizes        = @(39, 40, 41, 42)               # Cac size mo ban (mang so)
$colors       = @("Black", "Parchment")         # Cac mau sac mo ban (mang chuoi)
$description  = "Giay canvas co dien phong cach Vintage thanh lich."
$imageUrl     = "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=1200"
$initialStock = 15                              # So luong ton kho ban dau cho moi SKU (size/mau)

# --- [BUOC 2: XU LY LUU VAO TIKV QUA API] ---
$baseUrl = "http://localhost:8080"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "      BAT DAU DAY DU LIEU SAN PHAM VAO CO SO DU LIEU TIKV        " -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

# 1. Dang nhap Admin lay JWT token
Write-Host "[1/3] Dang nhap tai khoan Quan tri Admin..." -ForegroundColor Yellow
$loginPayload = @{ username = "admin"; password = "123456" } | ConvertTo-Json
try {
    $login = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body $loginPayload
    $headers = @{ "Authorization" = "Bearer $($login.token)" }
    Write-Host " -> Dang nhap thanh cong!" -ForegroundColor Green
} catch {
    Write-Host " -> Loi ket noi may chu backend: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# 2. Day thong tin san pham vao TiKV (Key: product:{shoeId})
Write-Host "[2/3] Luu san pham '$name' vao TiKV..." -ForegroundColor Yellow
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
    # Thu tao moi san pham (POST)
    $created = Invoke-RestMethod -Uri "$baseUrl/api/admin/products" -Method Post -Headers $headers -ContentType "application/json; charset=utf-8" -Body $productBytes
    Write-Host " -> [TAO MOI] Da tao Key thanh cong: product:$shoeId" -ForegroundColor Green
} catch {
    # Neu san pham da ton tai, tu dong chuyen sang Cap nhat (PUT)
    try {
        $created = Invoke-RestMethod -Uri "$baseUrl/api/admin/products/$shoeId" -Method Put -Headers $headers -ContentType "application/json; charset=utf-8" -Body $productBytes
        Write-Host " -> [CAP NHAT] Da cap nhat thanh cong Key: product:$shoeId" -ForegroundColor Green
    } catch {
        Write-Host " -> Loi luu san pham: $($_.Exception.Message)" -ForegroundColor Red
        exit
    }
}

# 3. Khoi tao ton kho cho tung ma SKU (Key: inv:{shoeId}:{size}:{color})
Write-Host "[3/3] Khoi tao ton kho ($initialStock doi cho moi phan loai SKU)..." -ForegroundColor Yellow
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
Write-Host " -> Da luu thanh cong $totalSkuCount ma SKU ton kho (Key: inv:$($shoeId):...)!" -ForegroundColor Green

# 4. Hien thi tong ket ket qua
Write-Host ""
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host " DAY DU LIEU THANH CONG VAO CO SO DU LIEU TIKV!                   " -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host " - Ma Key san pham   : product:$($created.shoeId)" -ForegroundColor White
Write-Host " - Ten san pham      : $($created.name)" -ForegroundColor White
Write-Host " - Hang / Brand      : $($created.brand)" -ForegroundColor White
Write-Host " - Gia niem yet      : $([string]::Format('{0:N0}', $created.price)) VND" -ForegroundColor White
Write-Host " - Cac Size mo ban   : $($created.sizes -join ', ')" -ForegroundColor White
Write-Host " - Cac Mau sac       : $($created.colors -join ', ')" -ForegroundColor White
Write-Host " - So luong ton kho  : $initialStock doi / SKU (Tong kho: $($totalSkuCount * $initialStock) doi)" -ForegroundColor White
Write-Host ""
Write-Host "[*] KIEM TRA NGAY TREN GIAO DIEN:" -ForegroundColor Yellow
Write-Host " 1. Web Cua hang  : http://localhost:5173/ (San pham xuat hien ngay)" -ForegroundColor White
Write-Host " 2. Web Quan tri  : http://localhost:5173/admin (Xem va sua ton kho)" -ForegroundColor White
Write-Host " 3. API Danh muc  : http://localhost:8080/api/shoes" -ForegroundColor White
Write-Host "==================================================================" -ForegroundColor Cyan
