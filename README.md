# Sora & VEO 视频生成器

AI 视频生成平台 - 支持 OpenAI Sora 和 Google VEO 视频生成

## 项目介绍

本项目是一个基于 **OpenAI Sora** 和 **Google VEO** 的 AI 视频生成平台，采用前后端分离架构：

- **后端服务** (`service-nest/`): 基于 NestJS 构建的 API 服务
- **前端应用** (`web-video/`): 基于 Vue 3 + Vite 构建的 Web 界面

## 支持功能

- [x] **Sora 视频生成** - 支持文生视频、图生视频
- [x] **VEO 视频生成** - 支持 Google VEO 3.1 模型
- [x] **多模型支持** - 支持 sora-2、veo_3_1-fast 等多种模型
- [x] **任务管理** - 视频生成任务队列管理和状态追踪
- [x] **角色管理** - Sora 角色创建与管理
- [x] **自定义参数** - 支持自定义视频时长、分辨率、方向等参数
- [x] **实时进度** - 视频生成进度实时查询

## 项目结构

```
├── service-nest/          # 后端服务 (NestJS)
│   ├── src/
│   │   ├── sora/          # Sora 视频生成模块
│   │   ├── app.module.ts
│   │   └── main.ts
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

## 环境变量

### 后端服务 (service-nest/.env)

| 环境变量 | 说明 | 默认值 |
| --- | --- | --- |
| PORT | 服务端口 | 3003 |
| SORA_SERVER | Sora API 服务地址 | - |
| SORA_KEY | Sora API 密钥 | - |
| SORA_CHARACTER_SERVER | Sora 角色 API 地址 (可选) | 同 SORA_SERVER |
| SORA_CHARACTER_KEY | Sora 角色 API 密钥 (可选) | 同 SORA_KEY |
| VEO_SERVER | VEO API 服务地址 | - |
| VEO_KEY | VEO API 密钥 | - |

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

### 2. 配置环境变量

复制 `service-nest/.env.example` 为 `service-nest/.env`，并填写相关配置：

```env
PORT=3003
SORA_SERVER=your_sora_api_server
SORA_KEY=your_sora_api_key
VEO_SERVER=your_veo_api_server
VEO_KEY=your_veo_api_key
```

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