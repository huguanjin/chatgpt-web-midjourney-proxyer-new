# Linux 云服务器部署文档

本文档详细介绍如何将 AI 创作平台部署到 Linux 云服务器上。支持两种部署方式：

- **方式一：CI/CD 镜像拉取部署（推荐）** — 代码推送后自动构建镜像，服务器直接拉取，无需传代码
- **方式二：Docker Compose 本地构建部署** — 服务器上克隆代码并构建
- **方式三：手动部署** — 直接在服务器上安装各组件

## 目录

### CI/CD 镜像拉取部署（推荐）
- [CI/CD 自动构建说明](#cicd-自动构建说明)
- [服务器拉取镜像部署](#服务器拉取镜像部署)
- [镜像更新（日常使用）](#镜像更新日常使用)

### Docker 本地构建部署
- [Docker 环境准备](#docker-环境准备)
- [一键启动](#一键启动)
- [Docker 配置说明](#docker-配置说明)
- [Docker 常用命令](#docker-常用命令)
- [Docker + HTTPS 配置](#docker--https-配置)

### 手动部署
- [环境要求](#环境要求)
- [一、服务器基础环境准备](#一服务器基础环境准备)
- [二、安装 MongoDB](#二安装-mongodb)
- [三、部署后端服务](#三部署后端服务)
- [四、部署前端应用](#四部署前端应用)
- [五、Nginx 反向代理配置](#五nginx-反向代理配置)
- [六、使用 PM2 进程管理](#六使用-pm2-进程管理)
- [七、防火墙配置](#七防火墙配置)
- [八、SSL 证书配置（HTTPS）](#八ssl-证书配置https)
- [九、常用运维命令](#九常用运维命令)
- [十、故障排查](#十故障排查)

---

# CI/CD 镜像拉取部署（推荐）

> **最省心的部署方式** — 本地提交代码到 GitHub → Actions 自动构建 Docker 镜像 → 服务器拉取最新镜像启动。无需在服务器上克隆代码或构建项目。

## CI/CD 自动构建说明

项目已配置 GitHub Actions 自动构建工作流（`.github/workflows/docker-image.yml`），会自动构建两个 Docker 镜像并推送到 **GitHub Container Registry (ghcr.io)**：

| 镜像 | 说明 |
|------|------|
| `ghcr.io/<你的GitHub用户名>/ai-creator-api` | 后端 API 服务 |
| `ghcr.io/<你的GitHub用户名>/ai-creator-web` | 前端 Web 应用 |

### 触发条件

| 事件 | 生成的标签 |
|------|------------|
| 推送到 `master` 分支 | `latest` + 短 SHA（如 `a1b2c3d`） |
| 发布 Release（如 `v1.0.0`） | `v1.0.0` + `latest` + 短 SHA |
| 手动触发（workflow_dispatch） | `latest` + 短 SHA |

### 前置配置

1. **设置仓库 Package 权限**
   - 进入 GitHub 仓库 → Settings → Actions → General
   - 在 "Workflow permissions" 中选择 **Read and write permissions**
   - 保存

2. **（可选）公开镜像**
   - 构建完成后，进入 GitHub 个人主页 → Packages
   - 点击对应的 Package → Package settings → Change visibility → Public
   - 设为 Public 后，服务器拉取无需登录认证

### 验证构建

推送代码后，在 GitHub 仓库的 **Actions** 标签页可以查看构建进度和日志。构建成功后，在仓库右侧的 **Packages** 中可以看到镜像。

## 服务器拉取镜像部署

### 1. 安装 Docker

```bash
# Ubuntu / Debian
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

### 2. 创建部署目录和配置文件

```bash
mkdir -p /opt/ai-creator
cd /opt/ai-creator

# 创建上传文件目录
mkdir -p uploads/images
```

### 3. 创建 docker-compose.yml

```bash
cat > docker-compose.yml << 'EOF'
services:
  api:
    image: ghcr.io/<OWNER>/ai-creator-api:latest
    container_name: ai-creator-api
    restart: unless-stopped
    environment:
      PORT: 3003
      NODE_ENV: production
      MONGODB_URI: mongodb://host.docker.internal:27017/
      MONGODB_DATABASE: PPTTOVideo
      TZ: Asia/Shanghai
    extra_hosts:
      - "host.docker.internal:host-gateway"
    volumes:
      - /opt/ai-creator/uploads:/app/uploads
    networks:
      - ai-creator-net

  web:
    image: ghcr.io/<OWNER>/ai-creator-web:latest
    container_name: ai-creator-web
    restart: unless-stopped
    depends_on:
      - api
    ports:
      - "80:80"
    networks:
      - ai-creator-net

networks:
  ai-creator-net:
EOF
```

> ⚠️ 将 `<OWNER>` 替换为你的 **GitHub 用户名（小写）**

### 4. 登录 GHCR（如镜像为私有仓库）

如果镜像是公开的（Public），跳过此步。如果是私有的：

```bash
# 在 GitHub 生成 Personal Access Token (classic)
# 权限勾选: read:packages
# 地址: https://github.com/settings/tokens

echo "YOUR_GITHUB_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

### 5. 拉取镜像并启动

```bash
cd /opt/ai-creator

# 拉取最新镜像
docker compose pull

# 启动服务
docker compose up -d

# 查看状态
docker compose ps

# 查看后端日志
docker compose logs -f api
```

### 6. 访问应用

| 地址 | 说明 |
|------|------|
| http://服务器IP | 前端应用 |
| http://服务器IP/config | 配置管理 |
| http://服务器IP/admin | 管理员面板 |

> **首次启动**会自动创建管理员账号：
> ```bash
> docker compose exec api cat /app/initial_admin_credentials.txt
> ```

## 镜像更新（日常使用）

每次推送代码到 `master` 后，GitHub Actions 会自动构建新镜像。在服务器上只需两条命令即可更新：

```bash
cd /opt/ai-creator

# 拉取最新镜像
docker compose pull

# 重启服务（自动使用新镜像）
docker compose up -d

# （可选）清理旧镜像释放磁盘空间
docker image prune -f
```

### 回滚到指定版本

如果新版本有问题，可以用 SHA 标签快速回滚：

```bash
# 查看可用标签
# 访问: https://github.com/<OWNER>?tab=packages

# 修改 docker-compose.yml 中的镜像标签
# image: ghcr.io/<OWNER>/ai-creator-api:a1b2c3d
# image: ghcr.io/<OWNER>/ai-creator-web:a1b2c3d

docker compose pull
docker compose up -d
```

---

# Docker Compose 本地构建部署

> 在服务器上克隆代码并本地构建 Docker 镜像。适合无法使用 GitHub Actions 或需要自定义构建的场景。

## Docker 环境准备

### 安装 Docker

```bash
# Ubuntu / Debian
curl -fsSL https://get.docker.com | sh

# 将当前用户加入 docker 组（免 sudo）
sudo usermod -aG docker $USER
newgrp docker

# 验证
docker --version
docker compose version
```

### CentOS 安装

```bash
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

## 一键启动

### 1. 上传项目到服务器

```bash
# 方式一：Git 克隆
cd /opt
git clone <your-repo-url> ai-creator
cd ai-creator

# 方式二：SCP 上传
scp -r ./project-files user@server:/opt/ai-creator/
```

### 2. 构建并启动

```bash
cd /opt/ai-creator

# 构建并启动所有服务（后台运行）
docker compose up -d --build

# 查看启动状态
docker compose ps

# 查看后端日志（确认启动成功）
docker compose logs -f api
```

### 3. 访问应用

| 地址 | 说明 |
|------|------|
| http://服务器IP | 前端应用 |
| http://服务器IP/config | 配置管理 |
| http://服务器IP/admin | 管理员面板 |

> **首次启动**会自动创建管理员账号，查看初始密码：
> ```bash
> docker compose exec api cat /app/initial_admin_credentials.txt
> # 或在日志中查看
> docker compose logs api | grep -A 5 "admin"
> ```

## Docker 配置说明

### 架构示意

```
┌────────────────────────────────────────────────┐
│              Docker Host                       │
│                                                │
│   ┌─────────┐   ┌────────┐                   │
│   │  Nginx  │───│  API   │──────┐            │
│   │  :80    │   │  :3003 │      │            │
│   └─────────┘   └────────┘      │            │
│    web 容器      api 容器       │            │
│                    │            │            │
│               ┌────┘            │            │
│               ▼                 ▼            │
│      /opt/ai-creator/      ┌──────────┐   │
│         uploads/           │ MongoDB  │   │
│       (宿主机目录)         │  :27017  │   │
│                           └──────────┘   │
│                           (宿主机自建)      │
└────────────────────────────────────────────────┘
```

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3003` | 后端 API 端口 |
| `MONGODB_URI` | `mongodb://host.docker.internal:27017/` | MongoDB 连接字符串（默认连接宿主机） |
| `MONGODB_DATABASE` | `PPTTOVideo` | 数据库名称 |

### 数据持久化

| 挂载路径 | 用途 |
|------|------|
| `/opt/ai-creator/uploads` → `/app/uploads` | 用户上传的图片文件 |

### MongoDB 连接配置

默认配置为连接服务器上自建的 MongoDB，通过 `host.docker.internal` 访问宿主机网络。

#### 前置条件：确保宿主机 MongoDB 允许本地连接

检查 MongoDB 配置文件：

```bash
sudo vi /etc/mongod.conf
```

确保 `bindIp` 包含 `127.0.0.1`（默认即可）：

```yaml
net:
  port: 27017
  bindIp: 127.0.0.1     # 仅允许本地连接（容器通过 host.docker.internal 也是本地）
```

确认 MongoDB 已启动：

```bash
sudo systemctl status mongod
# 如未安装，参考下方「手动部署」章节的 MongoDB 安装步骤
```

#### 无认证连接（默认）

`docker-compose.yml` 中：
```yaml
environment:
  MONGODB_URI: mongodb://host.docker.internal:27017/
  MONGODB_DATABASE: PPTTOVideo
```

#### 有认证连接（生产环境推荐）

先在宿主机 MongoDB 中创建用户：

```bash
mongosh

use PPTTOVideo
db.createUser({
  user: "appuser",
  pwd: "your_strong_password",
  roles: [{ role: "readWrite", db: "PPTTOVideo" }]
})
exit
```

然后修改 `docker-compose.yml`：

```yaml
environment:
  MONGODB_URI: mongodb://appuser:your_strong_password@host.docker.internal:27017/PPTTOVideo?authSource=PPTTOVideo
  MONGODB_DATABASE: PPTTOVideo
```

#### 可选：改用容器 MongoDB

如果你希望 MongoDB 也跑在容器中，编辑 `docker-compose.yml` 取消 `mongo` 服务的注释，并将 `MONGODB_URI` 改为：

```yaml
MONGODB_URI: mongodb://mongo:27017/
```

同时取消 `depends_on` 和 `volumes.mongo_data` 的注释。

## Docker 常用命令

```bash
# 启动
docker compose up -d

# 停止
docker compose down

# 重启某个服务
docker compose restart api

# 查看日志
docker compose logs -f api
docker compose logs -f web

# 重新构建并启动（代码更新后）
docker compose up -d --build

# 仅重建后端
docker compose build api && docker compose up -d api

# 进入容器调试
docker compose exec api sh
docker compose exec mongo mongosh

# 数据库备份（宿主机 MongoDB）
mongodump --db PPTTOVideo --out ./backup-$(date +%Y%m%d)

# 如 MongoDB 有认证
mongodump --uri="mongodb://appuser:password@localhost:27017/PPTTOVideo?authSource=PPTTOVideo" --out ./backup-$(date +%Y%m%d)

# 查看数据卷
docker volume ls
```

## Docker + HTTPS 配置

### 方式一：使用 Certbot（推荐）

在 Docker 外部安装 Certbot，用宿主机 Nginx 反向代理到 Docker 容器。

1. 修改 `docker-compose.yml`，将 web 端口改为非 80：

```yaml
  web:
    ports:
      - "8080:80"   # 改为 8080
```

2. 安装宿主机 Nginx + Certbot：

```bash
sudo apt install nginx certbot python3-certbot-nginx -y
```

3. 创建宿主机 Nginx 配置：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
        client_max_body_size 50M;
    }
}
```

4. 申请 SSL 证书：

```bash
sudo certbot --nginx -d your-domain.com
```

### 方式二：容器内 HTTPS

将 SSL 证书挂载进 web 容器，修改 `nginx.conf` 支持 443。

```yaml
  web:
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /etc/letsencrypt:/etc/letsencrypt:ro
```

---

# 手动部署

> 以下为不使用 Docker 的传统手动部署方式。

---

## 环境要求

| 组件 | 最低版本 | 推荐版本 |
|------|---------|---------|
| 操作系统 | Ubuntu 20.04 / CentOS 7 | Ubuntu 22.04 |
| Node.js | 18.x | 20.x LTS |
| pnpm | 8.x | 9.x |
| MongoDB | 6.0 | 7.0 |
| Nginx | 1.18 | 1.24+ |
| 内存 | 1GB | 2GB+ |
| 磁盘 | 10GB | 20GB+ |

---

## 一、服务器基础环境准备

### 1.1 更新系统

```bash
# Ubuntu / Debian
sudo apt update && sudo apt upgrade -y

# CentOS / RHEL
sudo yum update -y
```

### 1.2 安装 Node.js (通过 nvm)

```bash
# 安装 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# 加载 nvm
source ~/.bashrc

# 安装 Node.js 20 LTS
nvm install 20
nvm use 20
nvm alias default 20

# 验证安装
node -v   # 应显示 v20.x.x
npm -v
```

### 1.3 安装 pnpm

```bash
npm install -g pnpm
pnpm -v
```

### 1.4 安装 PM2（进程管理器）

```bash
npm install -g pm2
```

### 1.5 安装 Nginx

```bash
# Ubuntu / Debian
sudo apt install nginx -y

# CentOS / RHEL
sudo yum install epel-release -y
sudo yum install nginx -y

# 启动并设置开机自启
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 1.6 安装 Git

```bash
# Ubuntu / Debian
sudo apt install git -y

# CentOS / RHEL
sudo yum install git -y
```

---

## 二、安装 MongoDB

### 2.1 Ubuntu 安装 MongoDB 7.0

```bash
# 导入 MongoDB GPG 公钥
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
  sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# 添加 MongoDB 源（Ubuntu 22.04）
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# 安装
sudo apt update
sudo apt install -y mongodb-org

# 启动并设置开机自启
sudo systemctl start mongod
sudo systemctl enable mongod

# 验证状态
sudo systemctl status mongod
```

### 2.2 CentOS 安装 MongoDB 7.0

```bash
# 创建 yum 源文件
cat <<EOF | sudo tee /etc/yum.repos.d/mongodb-org-7.0.repo
[mongodb-org-7.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/\$releasever/mongodb-org/7.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-7.0.asc
EOF

# 安装
sudo yum install -y mongodb-org

# 启动
sudo systemctl start mongod
sudo systemctl enable mongod
```

### 2.3 配置 MongoDB 安全认证（推荐）

```bash
# 连接 MongoDB
mongosh

# 创建管理员用户
use admin
db.createUser({
  user: "admin",
  pwd: "your_strong_password",    # 请替换为强密码
  roles: [{ role: "root", db: "admin" }]
})

# 创建应用数据库用户
use PPTTOVideo
db.createUser({
  user: "appuser",
  pwd: "your_app_password",       # 请替换为强密码
  roles: [{ role: "readWrite", db: "PPTTOVideo" }]
})

exit
```

启用认证（编辑 MongoDB 配置文件）：

```bash
sudo vi /etc/mongod.conf
```

添加或修改以下内容：

```yaml
security:
  authorization: enabled

net:
  port: 27017
  bindIp: 127.0.0.1   # 仅允许本地连接
```

重启 MongoDB：

```bash
sudo systemctl restart mongod
```

---

## 三、部署后端服务

### 3.1 拉取代码

```bash
# 创建项目目录
sudo mkdir -p /opt/ai-creator
sudo chown $USER:$USER /opt/ai-creator

# 克隆代码
cd /opt/ai-creator
git clone <your-git-repo-url> .

# 或者通过 scp 上传
# scp -r ./project-files user@server:/opt/ai-creator/
```

### 3.2 安装后端依赖

```bash
cd /opt/ai-creator/service-nest
pnpm install
```

### 3.3 配置 MongoDB 连接

```bash
cp mongo_config.template.yaml mongo_config.yaml
vi mongo_config.yaml
```

根据是否启用认证，选择配置：

**无认证（开发/测试环境）：**
```yaml
mongodb:
  connection_string: "mongodb://localhost:27017/"
  database_name: "PPTTOVideo"
```

**有认证（生产环境推荐）：**
```yaml
mongodb:
  connection_string: "mongodb://appuser:your_app_password@localhost:27017/PPTTOVideo?authSource=PPTTOVideo"
  database_name: "PPTTOVideo"
```

### 3.4 构建后端

```bash
cd /opt/ai-creator/service-nest
pnpm build
```

### 3.5 创建上传目录

```bash
mkdir -p /opt/ai-creator/service-nest/uploads/images
```

### 3.6 启动测试

```bash
# 先手动启动验证
pnpm start:prod

# 查看输出是否有报错，确认服务启动在 3003 端口
# Ctrl+C 停止
```

---

## 四、部署前端应用

### 4.1 安装前端依赖

```bash
cd /opt/ai-creator/web-video
npm install
```

### 4.2 修改 API 地址（如需要）

如果前后端不在同一台服务器，需要修改 `vite.config.ts` 中的代理目标地址，或在构建时修改 API 基础路径。

生产环境建议通过 Nginx 统一代理，前端直接构建即可：

```bash
npm run build
```

构建产物在 `dist/` 目录中。

### 4.3 部署静态文件

```bash
# 将构建产物复制到 Nginx 服务目录
sudo mkdir -p /var/www/ai-creator
sudo cp -r dist/* /var/www/ai-creator/
sudo chown -R www-data:www-data /var/www/ai-creator
```

---

## 五、Nginx 反向代理配置

### 5.1 创建 Nginx 配置文件

```bash
sudo vi /etc/nginx/sites-available/ai-creator
```

写入以下配置：

```nginx
server {
    listen 80;
    server_name your-domain.com;   # 替换为你的域名或服务器 IP

    # 前端静态文件
    root /var/www/ai-creator;
    index index.html;

    # 前端路由 - Vue Router History 模式
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 代理
    location /v1/ {
        proxy_pass http://127.0.0.1:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # 超时设置（视频生成可能耗时较长）
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
    }

    # 上传文件静态访问
    location /uploads/ {
        alias /opt/ai-creator/service-nest/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # 文件上传大小限制
    client_max_body_size 50M;

    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;
}
```

### 5.2 启用配置

```bash
# Ubuntu (sites-available 方式)
sudo ln -s /etc/nginx/sites-available/ai-creator /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# CentOS (直接放在 conf.d 目录)
# sudo cp ai-creator.conf /etc/nginx/conf.d/

# 测试配置语法
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx
```

---

## 六、使用 PM2 进程管理

### 6.1 创建 PM2 配置文件

```bash
vi /opt/ai-creator/ecosystem.config.js
```

```javascript
module.exports = {
  apps: [
    {
      name: 'ai-creator-api',
      cwd: '/opt/ai-creator/service-nest',
      script: 'dist/main.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3003,
      },
      error_file: '/opt/ai-creator/logs/pm2-error.log',
      out_file: '/opt/ai-creator/logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
    },
  ],
}
```

### 6.2 创建日志目录

```bash
mkdir -p /opt/ai-creator/logs
```

### 6.3 启动服务

```bash
cd /opt/ai-creator
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs ai-creator-api

# 设置开机自启
pm2 save
pm2 startup
# 按照输出提示执行 sudo 命令
```

### 6.4 PM2 常用命令

```bash
pm2 restart ai-creator-api   # 重启
pm2 stop ai-creator-api      # 停止
pm2 delete ai-creator-api    # 删除
pm2 reload ai-creator-api    # 零停机重载
pm2 monit                    # 实时监控
```

---

## 七、防火墙配置

### 7.1 UFW（Ubuntu）

```bash
# 允许 SSH
sudo ufw allow 22

# 允许 HTTP 和 HTTPS
sudo ufw allow 80
sudo ufw allow 443

# 不要开放 3003 端口（通过 Nginx 代理）
# 不要开放 27017 端口（MongoDB 仅本地访问）

# 启用防火墙
sudo ufw enable
sudo ufw status
```

### 7.2 Firewalld（CentOS）

```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

---

## 八、SSL 证书配置（HTTPS）

### 8.1 使用 Let's Encrypt 免费证书

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx -y   # Ubuntu
# sudo yum install certbot python3-certbot-nginx -y  # CentOS

# 申请证书（需要域名已解析到服务器）
sudo certbot --nginx -d your-domain.com

# 自动续期测试
sudo certbot renew --dry-run
```

### 8.2 HTTPS Nginx 配置（自动生成）

Certbot 会自动修改 Nginx 配置。最终配置类似：

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # ... 其余配置同上 ...
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

---

## 九、常用运维命令

### 9.1 更新部署

```bash
cd /opt/ai-creator

# 拉取最新代码
git pull

# 更新后端
cd service-nest
pnpm install
pnpm build
pm2 restart ai-creator-api

# 更新前端
cd ../web-video
npm install
npm run build
sudo cp -r dist/* /var/www/ai-creator/
```

### 9.2 查看日志

```bash
# PM2 日志
pm2 logs ai-creator-api
pm2 logs ai-creator-api --lines 100

# Nginx 日志
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# MongoDB 日志
sudo tail -f /var/log/mongodb/mongod.log
```

### 9.3 数据库备份

```bash
# 导出数据库
mongodump --db PPTTOVideo --out /opt/ai-creator/backup/$(date +%Y%m%d)

# 带认证导出
mongodump --uri="mongodb://appuser:password@localhost:27017/PPTTOVideo?authSource=PPTTOVideo" --out /opt/ai-creator/backup/$(date +%Y%m%d)

# 恢复数据库
mongorestore --db PPTTOVideo /opt/ai-creator/backup/20260211/PPTTOVideo
```

### 9.4 自动备份脚本

```bash
vi /opt/ai-creator/backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/opt/ai-creator/backup"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# 备份数据库
mongodump --db PPTTOVideo --out $BACKUP_DIR/$DATE

# 保留最近 7 天的备份
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} + 2>/dev/null

echo "Backup completed: $BACKUP_DIR/$DATE"
```

```bash
chmod +x /opt/ai-creator/backup.sh

# 添加定时任务（每天凌晨 3 点备份）
crontab -e
# 添加: 0 3 * * * /opt/ai-creator/backup.sh >> /opt/ai-creator/logs/backup.log 2>&1
```

---

## 十、故障排查

### 10.1 后端服务无法启动

```bash
# 检查 Node.js 版本
node -v

# 检查端口占用
sudo lsof -i :3003

# 手动启动查看错误
cd /opt/ai-creator/service-nest
node dist/main.js

# 检查 MongoDB 连接
mongosh --eval "db.runCommand({ping:1})"
```

### 10.2 前端页面空白

```bash
# 检查 Nginx 配置
sudo nginx -t

# 检查前端文件是否存在
ls -la /var/www/ai-creator/

# 检查 Nginx 错误日志
sudo tail -20 /var/log/nginx/error.log
```

### 10.3 API 请求 502

```bash
# 检查后端是否在运行
pm2 status

# 检查后端日志
pm2 logs ai-creator-api --lines 50

# 重启后端
pm2 restart ai-creator-api
```

### 10.4 文件上传失败

```bash
# 检查上传目录权限
ls -la /opt/ai-creator/service-nest/uploads/

# 修复权限
sudo chown -R $USER:$USER /opt/ai-creator/service-nest/uploads/
chmod -R 755 /opt/ai-creator/service-nest/uploads/

# 检查 Nginx 文件大小限制
# 确保 client_max_body_size 设置足够大
```

### 10.5 MongoDB 内存不足

```bash
# 查看 MongoDB 内存使用
mongosh --eval "db.serverStatus().mem"

# 限制 WiredTiger 缓存大小（/etc/mongod.conf）
# storage:
#   wiredTiger:
#     engineConfig:
#       cacheSizeGB: 0.5
```

---

## 附：一键部署脚本

创建文件 `deploy.sh`：

```bash
#!/bin/bash
set -e

echo "==============================="
echo "  AI 创作平台 - 自动部署脚本"
echo "==============================="

PROJECT_DIR="/opt/ai-creator"
WEB_DIR="/var/www/ai-creator"

# 1. 进入项目目录
cd $PROJECT_DIR

# 2. 拉取最新代码
echo "[1/6] 拉取最新代码..."
git pull origin main

# 3. 构建后端
echo "[2/6] 安装后端依赖..."
cd $PROJECT_DIR/service-nest
pnpm install --frozen-lockfile

echo "[3/6] 构建后端..."
pnpm build

# 4. 构建前端
echo "[4/6] 安装前端依赖..."
cd $PROJECT_DIR/web-video
npm ci

echo "[5/6] 构建前端..."
npm run build
sudo cp -r dist/* $WEB_DIR/

# 5. 重启服务
echo "[6/6] 重启服务..."
cd $PROJECT_DIR
pm2 restart ai-creator-api

echo ""
echo "✅ 部署完成！"
echo "   前端: http://your-domain.com"
echo "   API:  http://your-domain.com/v1/"
```

```bash
chmod +x /opt/ai-creator/deploy.sh
```

---

## 安全注意事项

1. **修改默认管理员密码** - 首次部署后立即修改初始管理员密码
2. **保护配置文件** - 确保 `mongo_config.yaml` 不被公开访问
3. **启用 MongoDB 认证** - 生产环境务必启用数据库认证
4. **使用 HTTPS** - 传输 API 密钥和用户凭证时必须加密
5. **定期备份** - 设置数据库自动备份策略
6. **监控告警** - 建议配合 PM2 Plus 或其他监控工具
7. **防火墙规则** - 仅开放 80/443 端口，MongoDB 和后端 API 端口不直接对外暴露

---

## 部署方式对比

| 对比项 | CI/CD 镜像拉取（推荐） | Docker 本地构建 | 手动部署 |
|--------|----------------------|---------------|----------|
| 部署难度 | ⭐ 最简单 | ⭐⭐ 简单 | ⭐⭐⭐ 复杂 |
| 需要传代码到服务器 | ❌ 不需要 | ✅ 需要克隆仓库 | ✅ 需要 |
| 自动化构建 | ✅ 推送即构建 | ❌ 手动构建 | ❌ 手动构建 |
| 更新方式 | `pull` + `up -d` | `--build` + `up -d` | 手动更新各组件 |
| 环境隔离 | ✅ 完全隔离 | ✅ 完全隔离 | ❌ 共享系统环境 |
| 版本回滚 | ✅ 指定镜像标签 | ❌ 需要 git 回滚重建 | ❌ 复杂 |
| 服务器磁盘占用 | 少（仅镜像） | 多（代码 + 镜像） | 中等 |
| 调试便利 | 需进入容器 | 需进入容器 | 直接操作 |

> **推荐**：优先使用 CI/CD 镜像拉取方式，代码推送到 GitHub 后自动构建，服务器只需两条命令即可更新。
