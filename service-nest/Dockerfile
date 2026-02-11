# ==========================================
# Stage 1: Build
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# 安装 pnpm（锁定大版本，与 pnpm-lock.yaml v6.1 兼容）
RUN corepack enable && corepack prepare pnpm@8 --activate

# 先复制依赖清单，利用 Docker 缓存层
COPY package.json pnpm-lock.yaml ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 再复制源代码
COPY tsconfig.json nest-cli.json ./
COPY src/ ./src/

# 构建
RUN pnpm build

# ==========================================
# Stage 2: Production
# ==========================================
FROM node:20-alpine AS production

WORKDIR /app

# 安装 pnpm（与 builder 阶段版本一致）
RUN corepack enable && corepack prepare pnpm@8 --activate

# 只复制生产依赖清单
COPY package.json pnpm-lock.yaml ./

# 仅安装生产依赖
RUN pnpm install --frozen-lockfile --prod

# 从 builder 复制构建产物
COPY --from=builder /app/dist ./dist

# 复制配置模板文件（运行时用）
COPY mongo_config.template.yaml ./mongo_config.template.yaml

# 创建上传目录
RUN mkdir -p uploads/images

# 默认端口
ENV PORT=3003
ENV NODE_ENV=production

EXPOSE 3003

# 启动
CMD ["node", "dist/main.js"]
