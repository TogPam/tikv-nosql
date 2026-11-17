# Shoe Store E-Commerce

Ứng dụng thương mại điện tử giày dép gồm storefront cho khách hàng, backend REST API và trang quản trị. Backend Spring Boot dùng TiKV Java Client để lưu sản phẩm, tồn kho, đơn hàng và các key index dưới dạng key-value JSON. TiDB được khởi chạy kèm cụm local để thử giao thức MySQL; dữ liệu nghiệp vụ của ứng dụng không được lưu thành bảng SQL.

## Công nghệ

- Backend: Java 17+, Spring Boot 3.3.4, Maven, TiKV Java Client 3.3.0.
- Storage: TiKV và PD; TiDB chạy kèm trong container để truy cập MySQL protocol.
- Frontend: React 18, TypeScript, Vite 5, npm.
- Monitoring: Prometheus.
- Local cluster: Docker Compose và Docker Engine.

Compose dùng các image PingCAP tag `latest`; phiên bản có thể thay đổi khi pull image mới. Pin tag trong [docker-compose.yml](docker-compose.yml) nếu cần môi trường build tái lập.

## Yêu cầu

- Docker Engine và Docker Compose v2.
- JDK 17 trở lên và Maven.
- Node.js và npm nếu muốn chạy Vite development server.
- Khuyến nghị ít nhất 4 GB RAM và vài GB dung lượng trống cho Docker images và data volumes.

## Chạy lần đầu

Các lệnh sau chạy cụm TiKV/PD/TiDB và frontend static bằng một container, chạy backend Spring Boot trực tiếp trên máy host. Đây là cấu hình hiện tại của project: Compose không khởi chạy backend.

### 1. Khởi chạy TiKV, TiDB, frontend và Prometheus

Từ thư mục gốc repository:

```bash
docker compose up -d --build
docker compose ps
```

Lần đầu Docker cần tải images và build frontend, nên có thể mất vài phút. Xem log hoặc trạng thái services:

```bash
docker compose logs -f tikv-all-in-one
docker compose logs -f prometheus
```

Chờ TiKV nodes đăng ký với PD trước khi khởi chạy backend. Compose giữ dữ liệu trong named volumes khi dừng container.

### 2. Chạy backend

Mở terminal khác tại repository:

```bash
cd backend
mvn spring-boot:run
```

Backend đọc `TIKV_PD_ENDPOINTS`, mặc định là `127.0.0.1:2379`, và phục vụ API trên cổng `8080`. Nếu backend không kết nối được TiKV, kiểm tra container đang chạy và PD tại `http://localhost:2379`.

Kiểm tra API trong terminal khác:

```bash
curl http://localhost:8080/api/shoes
curl http://localhost:8080/api/inventory
```

### 3. Mở giao diện

- Storefront: <http://localhost:5173>
- Backend API: <http://localhost:8080/api>
- Swagger UI: <http://localhost:8080/swagger-ui/index.html>
- Trang quản trị database: <http://localhost:5173/admin/database>

Đăng nhập bằng tài khoản demo local `admin` / `123456`. Nếu bạn chạy Vite dev server thay vì frontend static trong Docker, Vite có thể chọn cổng `5174` vì cổng `5173` đang được container sử dụng. Backend hiện cho phép CORS từ hai cổng frontend này.

### Chạy frontend bằng Vite (tùy chọn)

Nếu muốn hot reload khi sửa frontend, mở terminal riêng:

```bash
cd frontend
npm install
npm run dev
```

Mở địa chỉ mà Vite in ra, thường là <http://localhost:5174> khi container đang chiếm cổng `5173`. Backend vẫn phải đang chạy ở cổng `8080`.

## Các công cụ thao tác dữ liệu

### TiKV Inspector: đọc key/value trực tiếp

Inspector dùng TiKV Java Client, kết nối PD và scan theo prefix. Chạy tại repository:

```bash
cd backend
mvn -q -DskipTests compile org.codehaus.mojo:exec-maven-plugin:3.5.0:java \
  -Dexec.mainClass=com.shoes.tools.TiKVInspector \
  -Dexec.args="127.0.0.1:2379 product:"
```

Thay prefix để xem nhóm dữ liệu khác:

```bash
# Inventory SKU
mvn -q -DskipTests compile org.codehaus.mojo:exec-maven-plugin:3.5.0:java -Dexec.mainClass=com.shoes.tools.TiKVInspector -Dexec.args="127.0.0.1:2379 inv:"

# Orders, payments, indexes
mvn -q -DskipTests compile org.codehaus.mojo:exec-maven-plugin:3.5.0:java -Dexec.mainClass=com.shoes.tools.TiKVInspector -Dexec.args="127.0.0.1:2379 order:"
mvn -q -DskipTests compile org.codehaus.mojo:exec-maven-plugin:3.5.0:java -Dexec.mainClass=com.shoes.tools.TiKVInspector -Dexec.args="127.0.0.1:2379 payment:"
mvn -q -DskipTests compile org.codehaus.mojo:exec-maven-plugin:3.5.0:java -Dexec.mainClass=com.shoes.tools.TiKVInspector -Dexec.args="127.0.0.1:2379 idx:"
```

Inspector chỉ đọc, không cập nhật hoặc xóa dữ liệu. Key đang dùng gồm `product:`, `inv:`, `order:`, `order_status:`, `payment:` và `idx:`. MySQL client kết nối TiDB sẽ không hiển thị những key này thành bảng SQL.

### Insomnia

Import [insomnia/shoe-store.insomnia.json](insomnia/shoe-store.insomnia.json) bằng **Insomnia → Import → From File**. Đặt `base_url` thành `http://localhost:8080`, gửi request login rồi chép `token` vào environment `customer_token` hoặc `admin_token`. Collection có request đọc catalog/tồn kho, xác thực, luồng đơn hàng và thao tác admin.

### Admin database console

Trang <http://localhost:5173/admin/database> cho admin xem tổng quan, tìm/xem và thêm/sửa sản phẩm, xem/cập nhật tồn kho, lọc/xem chi tiết đơn, chuyển trạng thái đơn theo luồng hợp lệ, và xuất snapshot JSON. Frontend gọi các API quản trị có xác thực JWT; không cho phép sửa key TiKV thô hoặc xóa tùy ý.

## Prometheus và TiKV Dashboard

- Prometheus: <http://localhost:9090>
- Target health: <http://localhost:9090/targets>
- PD Dashboard: <http://localhost:2379/dashboard/>

Prometheus cấu hình scrape PD, TiDB và ba TiKV status endpoints trong [monitoring/prometheus-all-in-one.yml](monitoring/prometheus-all-in-one.yml). Trong Dashboard, nếu cần chọn datasource thủ công, dùng **Change Prometheus Address** và nhập `http://prometheus:9090` (hostname trong Docker network, không phải `localhost`). Sau đó mở mục **Monitoring**.

## Tài khoản demo local

- Admin: `admin` / `123456`.
- Customer: `togpam` / `123456`.

Đây là thông tin demo được khai báo trong backend, chỉ dùng cho môi trường local. Không dùng mật khẩu mặc định này trong môi trường public hoặc production.

## Dừng dịch vụ

Dừng container nhưng giữ nguyên dữ liệu:

```bash
docker compose down
```

Xóa cả dữ liệu TiKV/PD và Prometheus để reset hoàn toàn:

```bash
docker compose down -v
```

Lệnh thứ hai sẽ xóa named volumes, không thể khôi phục dữ liệu từ các volume đó.