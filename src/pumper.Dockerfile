# Bắt đầu từ image gốc mà chúng ta cần
FROM fullstorydev/grpcurl:v1.9.1-alpine

# Chuyển sang user 'root' để cài đặt
USER root

# Cài đặt 'curl' và 'bash' (để dùng script tiện hơn)
# Xóa cache sau khi cài để giữ image nhẹ
RUN apk add --no-cache curl bash

# Bạn có thể giữ 'root' hoặc chuyển về user non-root
# USER root