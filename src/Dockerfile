FROM node:18-alpine

# Làm việc trong /app/src (package.json nằm ở src/)
WORKDIR /app/src

# Copy package trước để cache
COPY src/package*.json ./

# Chỉ cài production deps để tránh grpcc/grpc native
RUN npm ci --omit=dev

# Copy toàn bộ source
WORKDIR /app
COPY . /app

# Chạy trong /app/src
WORKDIR /app/src

EXPOSE 4000 50051
CMD ["node","index.js"]