# ==========================================
# Stage 1: Build
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# 复制依赖清单
COPY package.json package-lock.json* ./

# 安装依赖
RUN npm ci

# 复制源代码和配置
COPY tsconfig.json tsconfig.node.json vite.config.ts index.html ./
COPY public/ ./public/
COPY src/ ./src/
COPY .env.production ./.env.production

# 构建生产版本（跳过 vue-tsc 类型检查，避免版本兼容问题）
RUN npx vite build

# ==========================================
# Stage 2: Nginx
# ==========================================
FROM nginx:1.25-alpine AS production

# 删除默认配置
RUN rm /etc/nginx/conf.d/default.conf

# 复制自定义 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 从 builder 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8889

CMD ["nginx", "-g", "daemon off;"]
