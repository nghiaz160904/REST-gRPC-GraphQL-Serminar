FROM node:18-alpine

# Làm việc trong /app/src (package.json nằm ở src/)
WORKDIR /app/src

# Copy package trước để cache
COPY src/package*.json ./

# Cài deps
RUN npm ci

# Copy toàn bộ source
WORKDIR /app
COPY . /app

# Chạy trong /app/src
WORKDIR /app/src

EXPOSE 4000 50051
CMD ["node","index.js"]