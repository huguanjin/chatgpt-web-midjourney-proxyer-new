# Sora & VEO 视频生成器 + Gemini 图片创作

AI 创作平台 - 支持 OpenAI Sora 和 Google VEO 视频生成，以及 Gemini 图片创作

## 项目介绍

本项目是一个基于 **OpenAI Sora**、**Google VEO** 和 **Gemini** 的 AI 创作平台，采用前后端分离架构：

- **后端服务** (`service-nest/`): 基于 NestJS 构建的 API 服务
- **前端应用** (`web-video/`): 基于 Vue 3 + Vite 构建的 Web 界面

## 支持功能

- [x] **Sora 视频生成** - 支持文生视频、图生视频
- [x] **VEO 视频生成** - 支持 Google VEO 3.1 模型
- [x] **Gemini 图片创作** - 支持 gemini-3-pro-image-preview 模型
- [x] **多模型支持** - 支持 sora-2、veo_3_1-fast、gemini-3-pro-image-preview 等多种模型
- [x] **任务管理** - 视频/图片生成任务队列管理和状态追踪
- [x] **角色管理** - Sora 角色创建与管理
- [x] **自定义参数** - 支持自定义视频时长、分辨率、方向、图片宽高比、清晰度等参数
- [x] **实时进度** - 视频/图片生成进度实时查询
- [x] **在线配置** - 支持前端可视化配置管理，修改后实时生效无需重启
- [x] **多格式下载** - 图片支持 JPG/PNG 多格式下载

## 项目结构

```
├── service-nest/          # 后端服务 (NestJS)
│   ├── src/
│   │   ├── config/        # 配置管理模块
│   │   ├── sora/          # Sora 视频生成模块
│   │   ├── veo/           # VEO 视频生成模块
│   │   ├── gemini-image/  # Gemini 图片生成模块
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── config.json        # 配置文件 (需自行创建)
│   ├── config.example.json# 配置示例文件
│   └── package.json
│
├── web-video/             # 前端应用 (Vue 3)
│   ├── src/
│   │   ├── api/           # API 接口封装
│   │   ├── views/         # 页面组件
│   │   ├── stores/        # Pinia 状态管理
│   │   └── router/        # 路由配置
│   └── package.json
│
└── README.md
```

## 配置说明

### 配置文件 (service-nest/config.json)

项目使用 JSON 文件存储配置，支持前端在线修改，**修改后实时生效无需重启服务**。

| 配置项 | 说明 |
| --- | --- |
| `port` | 服务端口，默认 3003 |
| `sora.server` | Sora API 服务地址 |
| `sora.key` | Sora API 密钥 |
| `sora.characterServer` | Sora 角色 API 地址 (可选) |
| `sora.characterKey` | Sora 角色 API 密钥 (可选) |
| `veo.server` | VEO API 服务地址 |
| `veo.key` | VEO API 密钥 |
| `geminiImage.server` | Gemini 图片 API 地址 |
| `geminiImage.key` | Gemini 图片 API 密钥 |

## 快速开始

### 1. 安装依赖

```bash
# 后端
cd service-nest
pnpm install

# 前端
cd web-video
npm install
```

### 2. 配置

复制示例配置文件并填写 API 密钥：

```bash
cd service-nest
cp config.example.json config.json
```

编辑 `config.json` 填入真实的 API 配置，或者启动服务后通过前端配置页面在线编辑。

### 3. 启动服务

```bash
# 启动后端 (开发模式)
cd service-nest
pnpm start:dev

# 启动前端 (开发模式)
cd web-video
npm run dev
```

### 4. 访问应用

- 前端: http://localhost:5173
- 后端 API: http://localhost:3003
- **配置管理**: http://localhost:5173/config

## API 接口

### 视频生成

**创建视频任务**
```
POST /v1/video/create

{
  "model": "sora-2",
  "prompt": "视频描述",
  "orientation": "landscape",
  "duration": 10,
  "images": []
}
```

**查询任务状态**
```
GET /v1/video/query?id=task_id
```

### 图片生成

**同步生成图片**
```
POST /v1/image/generate

{
  "model": "gemini-3-pro-image-preview",
  "prompt": "图片描述",
  "aspectRatio": "1:1",
  "imageSize": "1K"
}
```

**查询图片任务**
```
GET /v1/image/query?id=task_id
```

### 配置管理

**获取配置 (脱敏)**
```
GET /v1/config
```

**更新服务配置**
```
PUT /v1/config/:service

{
  "server": "https://api-server.com",
  "key": "your-api-key"
}
```

## 技术栈

### 后端
- NestJS 10
- TypeScript 5
- Axios

### 前端
- Vue 3.4
- Vite 5
- Pinia
- Vue Router 4
- TypeScript 5

## 开发说明

### 构建生产版本

```bash
# 构建后端
cd service-nest
pnpm build

# 构建前端
cd web-video
npm run build
```

### 生产环境运行

```bash
# 运行后端
cd service-nest
pnpm start:prod
```

## License

MIT
如果我的开源项目对你有帮助，请考虑通过以下任意一种方式赞助: 
<br> `付款备注上您的联系方式`
<div style="display: flex; flex-wrap: wrap">
    <div style="width:200px">
        <img src="./docs/wxpay.jpg"  style="width:200px">
        <div>微信捐助</div>
    </div>
    <div style="width:200px">
        <img src="./docs/alipay.jpg"  style="width:200px"> 
        <div>支付宝捐助</div>
    </div>
</div>