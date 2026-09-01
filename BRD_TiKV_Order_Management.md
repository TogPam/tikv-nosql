# TÀI LIỆU YÊU CẦU KINH DOANH (BUSINESS REQUIREMENT DOCUMENT - BRD)
## Dự Án: Hệ Thống Quản Lý Trạng Thái Đơn Hàng Và Giao Dịch Phân Tán Trên TiKV & PD Dashboard

### 1. Tổng Quan Dự Án & Mục Tiêu Kinh Doanh

Hệ thống thương mại điện tử phân tán đòi hỏi tính khả dụng cao, khả năng mở rộng hàng ngang không gây gián đoạn dịch vụ và bảo đảm tính toàn vẹn dữ liệu chuẩn ACID cho giao dịch tài chính. Giải pháp được xây dựng dựa trên cơ sở dữ liệu Key-Value phân tán **TiKV**, bộ điều phối **Placement Driver (PD)** và ứng dụng **Spring Boot** đảm nhận vai trò cung cấp REST API cho xử lý giao dịch.

#### Mục tiêu kinh doanh:
* **Độ trễ thấp:** Đạt thời gian phản hồi (Latency) cho các thao tác đọc/ghi trạng thái đơn hàng < 15ms ở bách phân vị 99 (P99).
* **Khả năng chịu lỗi:** Hệ thống duy trì hoạt động liên tục ngay cả khi 1 trong 3 node TiKV ngắt kết nối.
* **Tối ưu hóa vận hành:** Quản trị, giám sát lưu lượng và phát hiện điểm nóng (Hotspot) truy vấn thông qua công cụ tập trung **PD Dashboard / TiKV Dashboard**.

---

### 2. Phạm Vi Dự Án (Scope of Work)

* **Trong phạm vi (In-Scope):**
  * Xây dựng dịch vụ backend Spring Boot cung cấp các API tạo đơn hàng, cập nhật trạng thái đơn (PENDING, PAID, SHIPPING, COMPLETED, CANCELLED) và truy vấn lịch sử giao dịch.
  * Tích hợp SDK `tikv-client-java` để Spring Boot giao tiếp với cụm TiKV thông qua PD.
  * Thiết lập cụm TiKV gồm 1 PD Node (điều phối metadata & TSO) và 3 TiKV Storage Nodes (TiKV1, TiKV2, TiKV3).
  * Sử dụng **PD Dashboard** để theo dõi chỉ số QPS, phân bổ dải khóa (Region Split/Merge), tình trạng nút và xung đột giao dịch.
* **Ngoài phạm vi (Out-of-Scope):**
  * Xây dựng giao diện người dùng (Frontend UI).
  * Kết nối thực tế với các cổng thanh toán bên thứ ba (sử dụng dịch vụ giả lập).

---

### 3. Kiến Trúc Hệ Thống & Luồng Xử Lý Giao Dịch

```text
+-------------------------------------------------------------+
|               Spring Boot Microservice Layer                |
|           (REST APIs, Business Logic, Transaction)           |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|                   TiKV Java Client Layer                    |
|          (Key-Value API, Two-Phase Commit / 2PC)            |
+-------------------------------------------------------------+
               /                              \
       (Key Route / TSO)               (Read / Write Data)
             /                                  \
            v                                    v
+-----------------------+            +------------------------+
| Placement Driver (PD) |            |   TiKV Cluster Layer   |
|  - Cluster Metadata   |            | +------+------+------+ |
|  - TSO Timestamp      |            | |TiKV1 |TiKV2 |TiKV3 | |
|  - Region Auto-Split  |            | +------+------+------+ |
+-----------------------+            +------------------------+
            |                                    ^
            +------------ PD Dashboard ----------+
                      (Monitoring & Mgmt)
```

#### Luồng dữ liệu khi tạo/cập nhật đơn hàng:
1. **Truy vấn Định tuyến & Timestamp (TSO):** Spring Boot kết nối `tikv-client-java` tới PD Node để lấy địa chỉ Region Leader nắm giữ dải khóa cần truy tác và mốc thời gian giao dịch nguyên tử (Timestamp Oracle).
2. **Thực thi Giao dịch Phân tán (Two-Phase Commit - 2PC):**
   * **Phase 1 (Prewrite):** Client gửi dữ liệu Key-Value (`order:{order_id}` -> `Payload JSON`) đến TiKV Leader. Leader thực hiện ghi khóa (lock) và đồng bộ bản sao sang các TiKV Follower nodes thông qua thuật toán đồng thuận Raft.
   * **Phase 2 (Commit):** Khi đạt đa số bỏ phiếu (Quorum), Client gửi lệnh Commit giải phóng khóa, hoàn tất lưu trữ trạng thái đơn hàng.
3. **Thu thập Giám sát:** PD tự động thu thập thông tin I/O, dung lượng dải khóa và hiển thị thời gian thực lên PD Dashboard.

---

### 4. Yêu Cầu Chức Năng (Functional Requirements)

| Mã YC | Chức Năng | Mô Tả Chi Tiết | Đầu Ra Mong Muốn |
| :--- | :--- | :--- | :--- |
| **FR-01** | Khởi tạo đơn hàng | Ghi thông tin đơn hàng mới vào cụm TiKV dạng Key-Value: Key = `order:{order_id}`, Value = `JSON payload`. | Trả về thông báo thành công HTTP 201, dữ liệu ghi nhất quán trên các node TiKV. |
| **FR-02** | Cập nhật trạng thái giao dịch | Thay đổi trạng thái đơn (ví dụ: PENDING -> PAID) sử dụng giao dịch 2PC nguyên tử. | Đảm bảo tính nhất quán dữ liệu (ACID), ngắt giao dịch nếu có xung đột khóa. |
| **FR-03** | Truy vấn đơn hàng | Đọc chi tiết đơn hàng theo `order_id` hoặc duyệt chuỗi khóa theo dải (Scan Range) bằng Key-Value API. | Trả về dữ liệu trạng thái đơn hàng trong thời gian < 10ms. |
| **FR-04** | Tự động phân tách Region | PD theo dõi kích thước dải khóa, tự động chia nhỏ khi Region vượt quá ngưỡng mặc định (96MB). | Dữ liệu giao dịch được phân bổ đều lên TiKV1, TiKV2 và TiKV3. |

---

### 5. Yêu Cầu Phi Chức Năng (Non-Functional Requirements)

* **Hiệu năng (Performance):** Đạt tối thiểu 5,000 QPS với độ trễ ghi P99 < 15ms.
* **Khả năng chịu lỗi (Fault Tolerance):** Khi 1 node TiKV gặp sự cố (Fail-stop), 2 node còn lại vẫn đảm bảo tính khả dụng của dữ liệu nhờ cơ chế Raft Quorum.Thời gian bầu chọn Leader mới < 3 giây.
* **Tính mở rộng (Scalability):** Cho phép bổ sung thêm node `TiKV4`, `TiKV5` vào cụm mà không cần dừng hệ thống.

---

### 6. Quản Trị Cụm Với PD Dashboard / TiKV Dashboard

PD Dashboard tích hợp sẵn trong PD Node (cổng mặc định `2379/dashboard`), cho phép đội ngũ vận hành quản lý các thông số hệ thống:

* **Overview (Tổng quan Cụm):** Giám sát trạng thái hoạt động của PD và 3 nút TiKV (Online / Offline / Unreachable), tổng QPS, độ trễ hệ thống.
* **Key Visualizer (Bản đồ nhiệt dải khóa):**
  * Hiển thị biểu đồ nhiệt (Heatmap) thể hiện mật độ đọc/ghi trên toàn bộ dải Key theo thời gian.
  * Phát hiện điểm nóng (**Hotspot**) khi lượng truy cập đơn hàng flash sale tập trung quá lớn vào một dải Key cụ thể để đưa ra phương án chia nhỏ Key.
* **Region & Peer Management:**
  * Theo dõi số lượng Region, phân bổ vị trí các bản sao (Leader/Follower) trên 3 node TiKV1, TiKV2, TiKV3.
  * Giám sát tiến trình Rebalancing và Region Split/Merge do PD thực hiện.
* **Transaction & Slow Queries:**
  * Cung cấp thông tin chi tiết các giao dịch xử lý chậm hoặc các giao dịch thất bại do xung đột khóa (Lock Conflict).

---

### 7. Hướng Dẫn Xây Dựng Ứng Dụng Minh Họa (PoC)

#### Bước 1: Khởi tạo Cụm TiKV Thử Nghiệm (TiUP)

```bash
# Cài đặt công cụ quản lý TiUP
curl --proto '=https' --tlsv1.2 -sSf https://tiup-mirrors.pingcap.com/install.sh | sh
source ~/.bashrc

# Khởi chạy cụm giả lập gồm 1 PD và 3 TiKV Storage Nodes
tiup playground --pd 1 --kv 3 --db 0
```
*Truy cập PD Dashboard tại địa chỉ: `http://127.0.0.1:2379/dashboard`*

#### Bước 2: Khai Báo Dependency Spring Boot

```xml
<!-- pom.xml -->
<dependency>
    <groupId>org.tikv</groupId>
    <artifactId>tikv-client-java</artifactId>
    <version>3.3.5</version>
</dependency>
```

#### Bước 3: Đăng Ký TiKV Client Bean Trong Spring Boot

```java
package com.ecommerce.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.tikv.common.TiConfiguration;
import org.tikv.common.TiSession;

@Configuration
public class TiKVConfig {

    @Bean
    public TiSession tiSession() {
        // Kết nối tới PD Endpoint
        TiConfiguration conf = TiConfiguration.createDefault("127.0.0.1:2379");
        return TiSession.create(conf);
    }
}
```

#### Bước 4: Xây Dựng Service Quản Lý Đơn Hàng

```java
package com.ecommerce.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.tikv.common.TiSession;
import org.tikv.raw.RawKVClient;
import org.tikv.shade.com.google.protobuf.ByteString;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Service
public class OrderService {

    @Autowired
    private TiSession tiSession;

    private final ObjectMapper mapper = new ObjectMapper();

    public void createOrder(String orderId, String status, double amount) throws Exception {
        try (RawKVClient client = tiSession.createRawClient()) {
            ByteString key = ByteString.copyFromUtf8("order:" + orderId);
            
            Map<String, Object> orderData = new HashMap<>();
            orderData.put("orderId", orderId);
            orderData.put("status", status);
            orderData.put("amount", amount);
            orderData.put("updatedAt", System.currentTimeMillis());

            ByteString value = ByteString.copyFromUtf8(mapper.writeValueAsString(orderData));
            
            // Ghi dữ liệu dạng Raw Key-Value vào TiKV Cluster
            client.put(key, value);
        }
    }

    public String getOrder(String orderId) {
        try (RawKVClient client = tiSession.createRawClient()) {
            ByteString key = ByteString.copyFromUtf8("order:" + orderId);
            ByteString value = client.get(key);
            
            if (value != null && !value.isEmpty()) {
                return value.toStringUtf8();
            }
            return null;
        }
    }
}
```

#### Bước 5: Thực Hiện Kiểm Thử & Quan Sát Trên Dashboard
1. Khởi chạy ứng dụng Spring Boot và gửi đồng thời 5,000 yêu cầu `POST /api/orders` tạo đơn hàng.
2. Mở PD Dashboard -> mục **Key Visualizer**, quan sát ma trận màu sáng hiển thị lưu lượng truy cập gia tăng trên dải khóa `order:*`.
3. Kiểm tra mục **Metrics** trên PD Dashboard để phân tích độ trễ của từng node `TiKV1`, `TiKV2`, `TiKV3`.
4. Giả lập sự cố ngắt nút `TiKV3` thông qua lệnh terminal, theo dõi quá trình PD tự động điều hướng lưu lượng truy vấn còn lại sang `TiKV1` và `TiKV2` mà ứng dụng Spring Boot không bị ngắt kết nối.
