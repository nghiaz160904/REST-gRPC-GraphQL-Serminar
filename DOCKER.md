# Docker Compose Guide + Cách test REST, GraphQL, gRPC, Prometheus, MongoDB

Dịch vụ trong compose:
- app: REST/GraphQL/Metrics trên 4000 (HTTP) và 50051 (gRPC)
- mongodb: MongoDB (nội bộ: 27017)
- prometheus: UI metrics trên 9090, đọc cấu hình từ ./prometheus.yml
- grpcurl: container tiện ích để test gRPC

Yêu cầu:
- Docker Engine + Docker Compose plugin

## 1) Khởi động
```bash
docker compose up -d --build
docker compose ps
docker compose logs -f --tail=100 app
```

Nếu thiếu file Prometheus, tạo nhanh:
```bash
cat > prometheus.yml <<'YAML'
global:
  scrape_interval: 10s
scrape_configs:
  - job_name: prometheus
    static_configs: [{ targets: ['prometheus:9090'] }]
  - job_name: app
    metrics_path: /metrics
    static_configs: [{ targets: ['app:4000'] }]
YAML
```

## 2) Kiểm tra nhanh
- App metrics: http://localhost:4000/metrics
- Prometheus UI: http://localhost:9090 (Targets: http://localhost:9090/targets)

---

## 3) Test REST (ví dụ với /articles)

Danh sách articles:
```bash
curl -i http://localhost:4000/articles
```

Lấy chi tiết theo id (thay <id>):
```bash
curl -i http://localhost:4000/articles/<id>
```

Tạo mới:
```bash
curl -i -X POST http://localhost:4000/articles \
  -H 'Content-Type: application/json' \
  -d '{"title":"Hello","content":"World"}'
```

Cập nhật:
```bash
curl -i -X PUT http://localhost:4000/articles/<id> \
  -H 'Content-Type: application/json' \
  -d '{"title":"Updated"}'
```

Xoá:
```bash
curl -i -X DELETE http://localhost:4000/articles/<id>
```

Gợi ý: chỉnh lại body/field theo API thực tế của bạn nếu khác.

---

## 4) Test GraphQL (endpoint: /graphql)

Khám phá schema (xem ArticlesPayload có field gì):
```bash
curl -s http://localhost:4000/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ __type(name:\"ArticlesPayload\") { fields { name type { kind name ofType { kind name ofType { kind name } } } } } }"}'
```

Danh sách articles (Relay-style, có phân trang):
```bash
curl -s http://localhost:4000/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"query($first:Int,$after:String){ articles(first:$first, after:$after){ totalCount pageInfo{ endCursor hasNextPage } edges{ cursor node { id title description comments{ author text } } } } }","variables":{"first":5}}'
```

Trang tiếp theo (thay <CURSOR> bằng giá trị pageInfo.endCursor ở trên):
```bash
curl -s http://localhost:4000/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"query($first:Int,$after:String){ articles(first:$first, after:$after){ totalCount pageInfo{ endCursor hasNextPage } edges{ cursor node { id title description } } } }","variables":{"first":5,"after":"<CURSOR>"}}'
```

Lấy 1 article theo id (id là String!):
```bash
curl -s http://localhost:4000/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"query($id:String!){ article(id:$id){ id title description comments{ author text } } }","variables":{"id":"<ARTICLE_ID>"}}'
```

Tạo article:
```bash
curl -s http://localhost:4000/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"mutation($input:ArticleInput){ createArticle(article:$input){ id title description } }","variables":{"input":{"title":"Hello","description":"World"}}}'
```

Cập nhật article (update toàn phần):
```bash
curl -s http://localhost:4000/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"mutation($id:ID!,$input:ArticleInput){ updateArticle(id:$id, article:$input){ id title description } }","variables":{"id":"<ARTICLE_ID>","input":{"title":"Updated","description":"Desc"}}}'
```

Cập nhật từng phần (patch):
```bash
curl -s http://localhost:4000/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"mutation($id:ID!,$title:String,$description:String){ patchArticle(id:$id, title:$title, description:$description){ id title description } }","variables":{"id":"<ARTICLE_ID>","title":"Patched"}}'
```

Xoá article:
```bash
curl -s http://localhost:4000/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"mutation($id:ID!){ deleteArticle(id:$id){ id title description } }","variables":{"id":"<ARTICLE_ID>"}}'
```

---

## 5) Test gRPC bằng grpcurl

Liệt kê service (cần server reflection):
```bash
docker exec -it grpcurl grpcurl -plaintext localhost:50051 list
```

Mô tả service:
```bash
docker exec -it grpcurl grpcurl -plaintext localhost:50051 describe <Your.Service>
```

Gọi method (ví dụ):
```bash
docker exec -it grpcurl grpcurl -plaintext -d '{}' localhost:50051 <Your.Service>/<Method>
```

Nếu không bật reflection, dùng .proto:
```bash
docker run --rm --network host -v "$PWD:/work" -w /work \
  fullstorydev/grpcurl:latest \
  grpcurl -plaintext -import-path . -proto path/to/your.proto localhost:50051 list
```

---

## 6) Kiểm tra MongoDB

Ping trong container:
```bash
docker exec -it mongodb mongosh --eval 'db.runCommand({ ping: 1 })'
```

Đếm số article (thay tên DB/collection nếu khác):
```bash
docker exec -it mongodb mongosh metricsdemo --eval 'db.articles.countDocuments()'
```

---

## 7) Prometheus nhanh

- Targets: http://localhost:9090/targets
- Query ví dụ: up, process_resident_memory_bytes, rate(process_cpu_seconds_total[1m])

---

## 8) Sự cố thường gặp

- App không thấy trong docker ps:
  - Xem log: docker compose logs -f --tail=200 app
  - Kiểm tra biến env Mongo: docker compose exec app sh -lc 'env | grep ^MONGO'
  - Đảm bảo MONGO_URL= mongodb://mongodb:27017/metricsdemo

- Lỗi EAI_AGAIN/undefined với Mongo:
  - Không đặt MONGO_HOST/MONGO_URL thành chuỗi "undefined".
  - Dùng MONGO_URL= mongodb://mongodb:27017/metricsdemo trong compose.

- Xung đột cổng 9090/27017:
  - Tìm tiến trình: sudo ss -lntp | grep -E ':9090|:27017'
  - Đổi map cổng trong compose (vd Prometheus 9091:9090, Mongo 127.0.0.1:27018:27017) hoặc dừng dịch vụ hệ thống.

- Prometheus mount lỗi:
  - Đảm bảo ./prometheus.yml là file, không phải thư mục.

Dừng:
```bash
docker compose down
```
Dừng và xoá dữ liệu:
```bash
docker compose down -v
```

---

## 9) Chạy script auto (pump REST/GraphQL/gRPC)

Script: scrripts/pump_getArticle_all.sh

Yêu cầu:
- Dịch vụ đã chạy: REST/GraphQL trên 4000, gRPC trên 50051
- Công cụ: curl và grpcurl

Cài nhanh trên máy host (Linux):
```bash
sudo apt update && sudo apt install -y curl
# cài grpcurl (nếu có Go)
go install github.com/fullstorydev/grpcurl/cmd/grpcurl@latest
export PATH="$HOME/go/bin:$PATH"
```

Chạy script:
```bash
chmod +x scrripts/pump_getArticle_all.sh
bash scrripts/pump_getArticle_all.sh <ARTICLE_ID> [--interval=1] [--count=0]
```

Ví dụ:
```bash
# pump mãi (Ctrl+C để dừng), mỗi 1s, id=1
bash scrripts/pump_getArticle_all.sh 1

# 0.2s/lần, 20 lần rồi dừng
bash scrripts/pump_getArticle_all.sh 1 --interval=0.2 --count=20

# id khác
bash scrripts/pump_getArticle_all.sh 42 --interval=0.5
```

Ghi chú:
- GraphQL schema yêu cầu id kiểu String!, script đã gửi biến "id" dạng chuỗi.
- Nếu cổng/địa chỉ khác, chỉnh REST_URL/GRAPHQL_URL/GRPC_TARGET trong script.
- Nếu báo “grpcurl: command not found”, cài grpcurl như trên.

Khắc phục nhanh:
- GraphQL 400 GRAPHQL_VALIDATION_FAILED: kiểm tra id có đúng kiểu String! (script đã dùng) và endpoint /graphql có nhận JSON (app.use(express.json())).
- gRPC chậm vài chục ms là do grpcurl khởi tạo kết nối mới mỗi lần; để đo chính xác hơn, viết client giữ kết nối persistent.