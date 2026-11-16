# HƯỚNG DẪN KIỂM TRA & CHỨNG MINH THAY ĐỔI DỮ LIỆU TRÊN CƠ SỞ DỮ LIỆU TIKV

Tài liệu này hướng dẫn chi tiết cách kiểm tra cấu trúc dữ liệu, chứng minh các thao tác **Đọc / Thêm / Sửa / Chuyển trạng thái đơn hàng** và cách quan sát sự biến động trên **TiKV Dashboard (Key Visualizer)** để phục vụ báo cáo và bảo vệ đồ án.

---

## PHẦN 1: HIỆN CÓ BAO NHIÊU "BẢNG" TRONG TIKV VÀ LÀM SAO ĐỂ XEM?

### 1. Bản chất dữ liệu trong TiKV
TiKV là hệ quản trị cơ sở dữ liệu phân tán **NoSQL Key-Value**. Trong TiKV không có khái niệm bảng (table) hay cột (column) theo mô hình quan hệ SQL, mà toàn bộ dữ liệu được quản lý theo dạng các **Namespace tiền tố Key**:
$$\text{KEY (chuỗi định danh UTF-8)} \longrightarrow \text{VALUE (chuỗi byte JSON)}$$

Hệ thống của bạn hiện có **5 Thực thể dữ liệu chính (5 bảng logic)** và **3 Không gian chỉ mục phụ (Secondary Indexes)**:

| STT | Thực thể (Bảng logic) | Cấu trúc Key mẫu | Dữ liệu Value bên trong | Mục đích nghiệp vụ |
|:---:|:---|:---|:---|:---|
| **1** | **Sản phẩm (Product)** | `product:{shoeId}` | JSON chứa tên, giá, hãng, danh sách size, màu, link ảnh | Lưu thông tin danh mục giày dép |
| **2** | **Tồn kho SKU (Inventory)** | `inv:{shoeId}:{size}:{color}` | JSON `{shoeId, size, color, availableQuantity, reservedQuantity}` | Quản lý số lượng có sẵn và số lượng đang giữ chỗ cho từng size/màu |
| **3** | **Đơn hàng (Order)** | `order:{orderId}` | JSON `{orderId, customerId, totalAmount, status, items, ...}` | Lưu thông tin chi tiết đơn hàng và các mặt hàng trong đơn |
| **4** | **Lịch sử trạng thái (Status History)** | `order_status:{orderId}:{epochMillis}` | JSON `{orderId, status, changedAt, note}` | Lưu nhật ký từng mốc chuyển đổi trạng thái (Audit Trail) |
| **5** | **Thanh toán (Payment)** | `payment:{paymentId}` | JSON `{paymentId, orderId, totalAmount, paymentMethod, paidAt}` | Lưu giao dịch thanh toán tài chính |
| *6* | *Index Khách hàng* | `idx:customer:{customerId}:order:{orderId}` | ID của đơn hàng | Tra cứu nhanh tất cả đơn của 1 khách hàng |
| *7* | *Index Trạng thái* | `idx:status:{status}:{orderId}` | ID của đơn hàng | Lọc nhanh các đơn theo trạng thái (Pending, Paid...) |
| *8* | *Index Thương hiệu* | `idx:brand:{brand}:{shoeId}` | ID của giày | Tìm kiếm giày theo nhãn hàng (Nike, Adidas...) |

---

### 2. Cách xem dữ liệu của từng "bảng"

#### Cách A: Xem trực quan trên Giao diện Web (Khuyên dùng khi báo cáo)
* **Xem Bảng Sản phẩm (`product:*`):** Truy cập [http://localhost:5173/](http://localhost:5173/) (Storefront).
* **Xem Bảng Tồn kho SKU (`inv:*`):** Truy cập [http://localhost:5173/admin](http://localhost:5173/admin) (Đăng nhập: `admin` / `123456`) $\rightarrow$ Xem bảng **Quản lý Tồn kho**.
* **Xem Bảng Đơn hàng (`order:*`):** Truy cập [http://localhost:5173/admin](http://localhost:5173/admin) $\rightarrow$ Xem bảng **Quản lý Đơn hàng**.
* **Xem Lịch sử trạng thái (`order_status:*`):** Truy cập [http://localhost:5173/orders/current](http://localhost:5173/orders/current) (Đăng nhập: `togpam` / `123456`) $\rightarrow$ Bấm vào đơn hàng để xem sơ đồ **Tiến độ giao hàng (Timeline)**.

#### Cách B: Xem trực tiếp dữ liệu thô (Raw JSON) qua Trình duyệt / API
Mở trực tiếp trên trình duyệt (hoặc qua Swagger [http://localhost:8080/swagger-ui/index.html](http://localhost:8080/swagger-ui/index.html)):
* Xem toàn bộ sản phẩm: [http://localhost:8080/api/shoes](http://localhost:8080/api/shoes)
* Xem toàn bộ 29 mã tồn kho SKU: [http://localhost:8080/api/inventory](http://localhost:8080/api/inventory)
* Xem 1 mã tồn kho cụ thể: [http://localhost:8080/api/inventory/SHOE-ADIDAS-UB/40/Core%20Black](http://localhost:8080/api/inventory/SHOE-ADIDAS-UB/40/Core%20Black)

---

## PHẦN 2: THÊM / XÓA / SỬA CÓ LÀM BIỂU ĐỒ NHIỆT (KEY VISUALIZER) THAY ĐỔI KHÔNG?

**CÂU TRẢ LỜI: CÓ THAY ĐỔI!**

### Cơ chế hoạt động của Bản đồ nhiệt (Key Visualizer):
1. **Chu kỳ ghi nhận:** TiKV thu thập thông số lưu lượng (Read bytes/sec, Write bytes/sec, QPS) theo từng dải Key và tổng hợp lên PD theo chu kỳ mỗi **1 phút**.
2. **Quy tắc màu sắc:**
   - **Màu đen / tím sẫm:** Vùng Key không có hoặc có rất ít lưu lượng truy cập (hệ thống rảnh rỗi).
   - **Màu tím sáng / xanh / vàng / đỏ rực:** Vùng Key đang có hoạt động đọc ghi dữ liệu dồn dập (**Hotspot - Điểm nóng truy vấn**).
3. **Lưu ý thực tế:**
   - Nếu bạn chỉ bấm 1-2 click chuột nhẹ, lượng dữ liệu chỉ vài trăm byte thì ô trên biểu đồ nhiệt chỉ sáng nhẹ màu tím nhạt.
   - Khi chạy script tạo tải (gửi liên tục các lệnh đọc/ghi trong 1 phút), trên biểu đồ nhiệt sẽ xuất hiện **vệt sáng rực rỡ đổi màu rõ rệt** ngay tại dải Key đó!

---

## PHẦN 3: KỊCH BẢN CHỨNG MINH THAY ĐỔI TRONG CƠ SỞ DỮ LIỆU

### Kịch bản 1: Chứng minh thao tác SỬA (Update tồn kho)
* **Mục tiêu:** Chứng minh việc sửa số lượng tồn kho cập nhật tức thì vào TiKV.
* **Các bước thực hiện:**
  1. Mở link kiểm tra số lượng hiện tại của đôi Adidas size 40 màu Core Black:  
     👉 [http://localhost:8080/api/inventory/SHOE-ADIDAS-UB/40/Core%20Black](http://localhost:8080/api/inventory/SHOE-ADIDAS-UB/40/Core%20Black)  
     *(Ghi nhớ giá trị `availableQuantity`, ví dụ: 9).*
  2. Mở Web Admin: [http://localhost:5173/admin](http://localhost:5173/admin) (Đăng nhập: `admin` / `123456`).
  3. Tìm đôi **Adidas Ultraboost Light**, cỡ **40**, màu **Core Black**.
  4. Sửa số lượng thành **88**, sau đó bấm nút **Lưu**.
  5. F5 lại đường link ở Bước 1 $\rightarrow$ Giá trị `availableQuantity` đổi ngay thành **88**.

---

### Kịch bản 2: Chứng minh thao tác THÊM & GIAO DỊCH 2PC (Tạo đơn hàng)
* **Mục tiêu:** Chứng minh tính nguyên tử (ACID) của giao dịch phân tán TiKV Two-Phase Commit khi tạo đơn hàng.
* **Các bước thực hiện:**
  1. Khách hàng vào [http://localhost:5173/](http://localhost:5173/) (Đăng nhập: `togpam` / `123456`).
  2. Chọn một đôi giày bất kỳ, chọn size, màu và bấm **Đặt hàng ngay**.
  3. **Chứng minh sự thay đổi trong TiKV:**
     - Key tồn kho `inv:...`: `availableQuantity` tự động bị trừ đi 1 và `reservedQuantity` tăng lên 1 (hệ thống giữ chỗ kho).
     - Key đơn hàng `order:ORD-...` mới được sinh ra với trạng thái ban đầu là `PENDING_PAYMENT`.
     - Key lịch sử `order_status:ORD-...:{timestamp}` ghi nhận mốc thời gian tạo đơn.
     *(Nếu bước trừ kho thất bại do hết hàng, giao dịch 2PC sẽ tự động hủy bỏ, không tạo đơn rác).*

---

### Kịch bản 3: Chứng minh QUẢN LÝ TRẠNG THÁI ĐƠN HÀNG (State Machine & History)
* **Mục tiêu:** Chứng minh trạng thái đơn hàng được chuyển đổi hợp lệ và lưu vết lịch sử không thể thay đổi.
* **Các bước thực hiện:**
  1. Vào [http://localhost:5173/orders/current](http://localhost:5173/orders/current), bấm vào đơn hàng vừa tạo.
  2. Quan sát sơ đồ **Tiến độ giao hàng (Timeline)** đang ở mốc `Chờ thanh toán`.
  3. Bấm nút **"Xác nhận thanh toán"** (hoặc "Hủy đơn hàng").
  4. Ngay lập tức:
     - Trạng thái trên màn hình nhảy sang **"Đã thanh toán"** với dấu tick xanh và mốc giờ chính xác.
     - Số lượng `reservedQuantity` trong kho được giải phóng và trừ đứt điểm vào kho chính thức.
  5. **Xem bằng chứng lưu vết trong TiKV bằng PowerShell:**
     Chạy lệnh sau trong PowerShell để lấy toàn bộ chuỗi lịch sử trạng thái:
     ```powershell
     $login = Invoke-RestMethod -Uri "http://localhost:8080/api/auth/login" -Method Post -ContentType "application/json" -Body '{"username":"togpam","password":"123456"}'
     Invoke-RestMethod -Uri "http://localhost:8080/api/orders" -Headers @{ "Authorization" = "Bearer $($login.token)" } | Select-Object -First 1 | ForEach-Object {
         Invoke-RestMethod -Uri "http://localhost:8080/api/orders/$($_.orderId)/history" -Headers @{ "Authorization" = "Bearer $($login.token)" } | Format-Table -AutoSize
     }
     ```
     **Kết quả hiển thị:**
     ```text
     orderId                status          changedAt                     note
     -------                ------          ---------                     ----
     ORD-20261116-706E83DA  PENDING_PAYMENT 2026-11-16T11:00:28.658461300 Order created
     ORD-20261116-706E83DA  PAID            2026-11-16T11:00:45.257900200 PAID
     ```

---

## PHẦN 4: HƯỚNG DẪN KÍCH HOẠT BIỂU ĐỒ NHIỆT (KEY VISUALIZER DEMO)

Để biểu đồ nhiệt trên TiKV Dashboard sáng rực lên đổi màu cho hội đồng chấm đồ án xem:

1. Mở PowerShell trong thư mục dự án và chạy script mô phỏng tải:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\demo-hotspot.ps1
   ```
2. Mở trình duyệt vào TiKV Dashboard:
   👉 [http://localhost:2379/dashboard](http://localhost:2379/dashboard)
3. Bấm chọn menu **Key Visualizer** (bên cột trái).
4. Chọn khoảng thời gian **Recent 30 min** (hoặc nhấn nút Refresh sau 1 phút).
5. Bạn sẽ thấy trên dòng thời gian xuất hiện các **ô nhiệt sáng màu (vàng/cam/tím rực)** đại diện cho các giao dịch và lưu lượng đọc ghi vừa tác động lên cụm TiKV!
