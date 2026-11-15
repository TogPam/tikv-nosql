# Shoe Store E-Commerce

Ứng dụng thương mại điện tử giày dép gồm cửa hàng trực tuyến cho khách hàng và trang quản trị. Backend Spring Boot cung cấp REST API, xác thực JWT, quản lý sản phẩm, tồn kho và đơn hàng. Dữ liệu được lưu trong TiKV thông qua TiKV Java Client; cụm local chạy bằng Docker Compose cùng PD và TiDB. Frontend React hỗ trợ duyệt sản phẩm, giỏ hàng, đặt hàng, theo dõi đơn và thanh toán bằng VietQR.

## Công nghệ và phiên bản

| Thành phần | Phiên bản trong cấu hình | Ghi chú |
| --- | --- | --- |
| Java | 17 | Phiên bản biên dịch backend; môi trường hiện tại chạy Java 21.0.12 |
| Spring Boot | 3.3.4 | Backend REST API và Spring Security |
| TiKV Java Client | 3.3.0 | Client giao dịch tới TiKV thông qua PD |
| TiKV, PD, TiDB | `pingcap/*:latest` | Compose chưa pin image tag; runtime TiKV/PD đã kiểm tra là 7.5.1 |
| Maven | 3.10.0 | Phiên bản có trong môi trường phát triển hiện tại |
| React / React DOM | 18.3.1 | Frontend |
| Vite | 5.4.11 | Development server và bundler |
| TypeScript | 5.6.3 | Kiểm tra kiểu và build frontend |
| Tailwind CSS | 3.4.16 | CSS tooling |
| Axios | 1.7.7 | HTTP client |
| Node.js / npm | 26.13.0 / 12.2.2 | Phiên bản dùng để build frontend trong môi trường hiện tại |

Các image TiKV, PD và TiDB đang dùng tag `latest`, nên phiên bản thực tế có thể đổi khi pull image mới. Nếu cần build tái lập, hãy pin phiên bản image trong `docker-compose.yml`.

## Chạy local

### Yêu cầu

- Docker Engine hoặc Docker Desktop với Docker Compose.
- JDK 17 trở lên và Maven.
- Node.js và npm.
- Khoảng 4 GB RAM và vài GB dung lượng trống cho các container TiKV.

### 1. Build backend JAR

Tại thư mục gốc dự án:

```bash
cd backend
mvn clean package -DskipTests
cd ..
```

Lệnh này tạo `backend/target/shoe-store-1.0.0.jar`, là artifact được backend Docker image sử dụng.

### 2. Khởi động backend và cụm TiKV

Tại thư mục gốc dự án, nơi có `docker-compose.yml`:

```bash
docker compose up -d --build
```

Backend chạy trong cùng Docker network với PD/TiKV để phân giải được các địa chỉ store nội bộ. Không chạy backend trực tiếp trên host bằng `mvn spring-boot:run` với cấu hình Compose hiện tại: PD quảng bá hostname `tikv1` và `tikv2`, chỉ phân giải được trong Docker network.

Kiểm tra container và log backend:

```bash
docker compose ps
docker compose logs -f backend
```

### 3. Chạy frontend

Mở terminal khác:

```bash
cd frontend
npm install
npm run dev
```

Mở cửa hàng tại <http://localhost:5173>. Frontend gọi backend tại <http://localhost:8080/api>.

### Địa chỉ dịch vụ

- Cửa hàng: <http://localhost:5173>
- Backend API: <http://localhost:8080/api>
- Giao diện OpenAPI: <http://localhost:8080/swagger-ui/index.html>
- PD API: <http://localhost:2379>
- TiDB MySQL protocol: `127.0.0.1:4000`

Kiểm tra API danh mục sản phẩm:

```bash
curl http://localhost:8080/api/shoes
```

### Dừng dịch vụ

Tại thư mục gốc dự án:

```bash
docker compose down
```

Lệnh trên giữ lại dữ liệu trong named volume. Không thêm `-v` nếu muốn giữ dữ liệu TiKV/PD.
