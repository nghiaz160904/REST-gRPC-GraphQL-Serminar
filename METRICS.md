# Metrics Guide (REST / GraphQL / gRPC)

## 1. Cài đặt & chạy
```bash
npm install
export ACCESS_TOKEN_SECRET=devsecret
export CORS_ALLOWED_DOMAIN=http://localhost:4000
export METRICS_DEBUG=1            # để log (tùy chọn)
node src/index.js                 # hoặc nodemon src/index.js
```

## 2. Endpoint metrics
- HTTP metrics endpoint: GET http://localhost:4000/metrics
- Prometheus scrape config ví dụ:
```yaml
scrape_configs:
  - job_name: nodejs-app
    metrics_path: /metrics
    static_configs:
      - targets: ['localhost:4000']
```

## 3. REST (/articles)
Histogram: rest_article_request_duration_seconds  
Labels: method, status_code  
Được ghi khi URL bắt đầu bằng /articles.  
Test:
```bash
curl -i http://localhost:4000/articles
curl -s http://localhost:4000/metrics | grep rest_article_request_duration_seconds
```

## 4. GraphQL (operations có article / articles)
Histogram: graphql_article_request_duration_seconds  
Labels: operation, status_code  
Ghi khi body.query chứa article hoặc articles.  
Ví dụ:
```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"query Articles{ articles(first:3){ description } }","operationName":"Articles"}'
curl -s http://localhost:4000/metrics | grep graphql_article_request_duration_seconds
```

## 5. gRPC (getArticle ví dụ)
Histogram: grpc_request_duration_seconds  
Labels: method, status_code  
Client test:
```javascript
// scripts/grpc-test.js
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const def = protoLoader.loadSync('src/grpc/proto/schema.proto');
const proto = grpc.loadPackageDefinition(def).example;
const c = new proto.Main('localhost:50051', grpc.credentials.createInsecure());
c.getArticle({ id: '123' }, (err, resp) => {
  if (err) console.error(err); else console.log(resp);
});
```
Run:
```bash
node scripts/grpc-test.js
curl -s http://localhost:4000/metrics | grep grpc_request_duration_seconds
```

## 6. Các series sinh ra (Histogram)
Mỗi metric tạo:
- <name>_bucket
- <name>_sum
- <name>_count

## 7. PromQL cơ bản
Throughput (QPS):
```promql
sum(rate(rest_article_request_duration_seconds_count[5m]))
sum(rate(graphql_article_request_duration_seconds_count[5m]))
sum(rate(grpc_request_duration_seconds_count[5m]))
```
Mean latency:
```promql
sum(rate(rest_article_request_duration_seconds_sum[5m]))
/
sum(rate(rest_article_request_duration_seconds_count[5m]))
```
P95:
```promql
histogram_quantile(0.95,
  sum by (le)(rate(rest_article_request_duration_seconds_bucket[5m]))
)
```
Error rate (REST):
```promql
sum(rate(rest_article_request_duration_seconds_count{status_code!="200"}[5m]))
/
sum(rate(rest_article_request_duration_seconds_count[5m]))
```

## 8. Debug
- METRICS_DEBUG=1 để thấy log start/finish.
- Kiểm tra /metrics trực tiếp trước khi xem trên Prometheus.
- Chờ ≥1 chu kỳ scrape (ví dụ 15s) sau khi gọi endpoint.

## 9. Reset metric trong app (dev)
Dòng client.register.clear() ở đầu src/index.js xóa registry trước khi định nghĩa lại các metric.  
Xóa dữ liệu cũ trong Prometheus (dev-only) cần bật --web.enable-admin-api hoặc xóa thư mục TSDB (không khuyến nghị production).

## 10. Mở rộng
Có thể hợp nhất 3 histogram thành api_request_duration_seconds với label protocol = rest | graphql | grpc để đơn giản hóa PromQL.