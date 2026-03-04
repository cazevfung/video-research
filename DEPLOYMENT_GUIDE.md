# 部署指南

本文档详细介绍了 AI 视频研究助手项目的部署流程，包含环境变量配置、服务端部署方案以及多平台部署选项。

---

## 目录

1. [部署架构概览](#部署架构概览)
2. [环境变量配置](#环境变量配置)
3. [后端部署](#后端部署)
4. [前端部署](#前端部署)
5. [数据库配置](#数据库配置)
6. [第三方服务配置](#第三方服务配置)
7. [生产环境检查清单](#生产环境检查清单)

---

## 部署架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                         用户层                                  │
│                    浏览器 / 移动设备                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        前端部署层                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Firebase    │  │    Vercel    │  │     AWS S3           │  │
│  │   Hosting    │  │              │  │  + CloudFront        │  │
│  │  (推荐)      │  │              │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│         │                │                    │                 │
│         └────────────────┴────────────────────┘                 │
│                          │                                      │
│                    Next.js 静态导出                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ API 请求 / SSE 连接
┌─────────────────────────────────────────────────────────────────┐
│                        后端部署层                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Google Cloud │  │    AWS ECS   │  │    Azure App         │  │
│  │    Run       │  │   / Fargate  │  │    Service           │  │
│  │  (推荐)      │  │              │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│         │                │                    │                 │
│         └────────────────┴────────────────────┘                 │
│                          │                                      │
│              Node.js + Express + Docker                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      第三方服务层                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Firebase   │  │   Supadata   │  │    DashScope         │  │
│  │  (Firestore) │  │  (YouTube)   │  │   (AI 模型)          │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 环境变量配置

### 后端环境变量

创建 `backend/.env` 文件：

```bash
# ============================================
# 必需环境变量 (无默认值，必须设置)
# ============================================

# Supadata API Key - 用于 YouTube 视频搜索和字幕获取
# 获取地址: https://supadata.ai/
SUPADATA_API_KEY=your_supadata_api_key_here

# DashScope API Key (通义千问) - 用于 AI 内容生成
# 获取地址: https://dashscope.aliyun.com/
DASHSCOPE_BEIJING_API_KEY=your_dashscope_api_key_here

# 前端 URL - 用于 CORS 配置
FRONTEND_URL=https://your-frontend-url.com

# 允许多个前端 URL (逗号分隔)
FRONTEND_URLS=https://your-frontend-url.com,https://your-frontend-url-2.com

# 运行环境
NODE_ENV=production

# ============================================
# 可选环境变量 (有默认值)
# ============================================

# 日志级别 (可选: debug, info, warn, error)
LOG_LEVEL=info

# 端口 (Cloud Run 会自动设置 PORT 环境变量)
PORT=8080

# 认证模式 (true/false)
USE_FIREBASE_AUTH=true

# YouTube API Keys (可选，用于获取视频元数据)
YOUTUBE_API_KEYS=key1,key2,key3

# Firestore 配置 (如果使用 Firebase)
# 本地开发时不需要，生产环境使用服务账号
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# ============================================
# 开发专用变量 (生产环境请勿使用)
# ============================================

# 禁用认证 (仅开发使用)
# AUTH_ENABLED=false

# 使用本地存储代替 Firestore (仅开发使用)
# USE_LOCAL_STORAGE=true
```

### 前端环境变量

#### 开发环境 `.env.local`

```bash
# API 后端地址
NEXT_PUBLIC_API_URL=http://localhost:5000

# 是否使用 Firebase 认证
NEXT_PUBLIC_USE_FIREBASE_AUTH=false

# Firebase 配置
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

#### 生产环境 `.env.production`

```bash
# ⚠️ 重要: 必须指向生产后端，不能使用 localhost
NEXT_PUBLIC_API_URL=https://your-backend-url.run.app

NEXT_PUBLIC_USE_FIREBASE_AUTH=true

# Firebase 配置 (与后端同一项目)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# 是否跳过认证提示
NEXT_PUBLIC_SKIP_AUTH=false
```

---

## 后端部署

### 方案 1: Google Cloud Run (推荐)

Cloud Run 是无服务器容器平台，按请求计费，适合本项目的 SSE 长连接需求。

#### 步骤 1: 构建 Docker 镜像

```bash
cd backend

# 本地构建测试
docker build -t video-research-backend .

# 验证构建结果
docker run -p 8080:8080 --env-file .env video-research-backend
```

#### 步骤 2: 推送镜像到 Google Container Registry

```bash
# 配置项目 ID
export PROJECT_ID=your-gcp-project-id

# 标记镜像
docker tag video-research-backend gcr.io/$PROJECT_ID/video-research-backend:latest

# 推送镜像 (需要先安装 gcloud CLI 并认证)
gcloud auth configure-docker
docker push gcr.io/$PROJECT_ID/video-research-backend:latest
```

#### 步骤 3: 部署到 Cloud Run

**方式 A: 通过 gcloud CLI**

```bash
# 基础部署
gcloud run deploy video-research-backend \
  --image gcr.io/$PROJECT_ID/video-research-backend:latest \
  --platform managed \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --concurrency 1000 \
  --max-instances 10 \
  --timeout 300 \
  --set-env-vars "NODE_ENV=production" \
  --set-env-vars "FRONTEND_URL=https://your-frontend-url.com"

# 添加敏感环境变量 (Secrets Manager 更安全)
gcloud run services update video-research-backend \
  --region asia-southeast1 \
  --update-secrets "SUPADATA_API_KEY=supadata-api-key:latest" \
  --update-secrets "DASHSCOPE_BEIJING_API_KEY=dashscope-api-key:latest"
```

**方式 B: 通过 Cloud Build (CI/CD)**

创建 `cloudbuild.yaml`:

```yaml
steps:
  # 构建镜像
  - name: 'gcr.io/cloud-builders/docker'
    args: 
      - 'build'
      - '-t'
      - 'gcr.io/$PROJECT_ID/video-research-backend:$COMMIT_SHA'
      - '-t'
      - 'gcr.io/$PROJECT_ID/video-research-backend:latest'
      - '.'

  # 推送镜像
  - name: 'gcr.io/cloud-builders/docker'
    args: 
      - 'push'
      - 'gcr.io/$PROJECT_ID/video-research-backend:$COMMIT_SHA'

  # 部署到 Cloud Run
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'video-research-backend'
      - '--image'
      - 'gcr.io/$PROJECT_ID/video-research-backend:$COMMIT_SHA'
      - '--region'
      - 'asia-southeast1'
      - '--platform'
      - 'managed'
      - '--allow-unauthenticated'
      - '--memory'
      - '1Gi'
      - '--cpu'
      - '1'

images:
  - 'gcr.io/$PROJECT_ID/video-research-backend:$COMMIT_SHA'
  - 'gcr.io/$PROJECT_ID/video-research-backend:latest'
```

提交触发构建:

```bash
gcloud builds submit --config cloudbuild.yaml
```

#### 步骤 4: 配置环境变量 (Cloud Run)

```bash
# 批量设置环境变量
gcloud run services update video-research-backend \
  --region asia-southeast1 \
  --update-env-vars "NODE_ENV=production" \
  --update-env-vars "FRONTEND_URL=https://your-frontend-url.com" \
  --update-env-vars "FRONTEND_URLS=https://your-frontend-url.com,https://www.your-frontend-url.com" \
  --update-env-vars "USE_FIREBASE_AUTH=true" \
  --update-env-vars "LOG_LEVEL=info"
```

#### 步骤 5: 配置 Secrets Manager (推荐用于 API Keys)

```bash
# 创建 Secret
echo -n "your-supadata-key" | gcloud secrets create supadata-api-key --data-file=-
echo -n "your-dashscope-key" | gcloud secrets create dashscope-api-key --data-file=-

# 授权 Cloud Run 访问 Secret
gcloud secrets add-iam-policy-binding supadata-api-key \
  --member="serviceAccount:YOUR-PROJECT-NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# 挂载 Secret 到 Cloud Run
gcloud run services update video-research-backend \
  --region asia-southeast1 \
  --update-secrets "SUPADATA_API_KEY=supadata-api-key:latest,DASHSCOPE_BEIJING_API_KEY=dashscope-api-key:latest"
```

---

### 方案 2: AWS ECS (Fargate)

适合已在 AWS 生态的用户。

#### 步骤 1: 创建 ECR 仓库并推送镜像

```bash
# 创建仓库
aws ecr create-repository --repository-name video-research-backend

# 登录 ECR
aws ecr get-login-password --region ap-northeast-1 | \
  docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.ap-northeast-1.amazonaws.com

# 标记并推送
docker tag video-research-backend:latest \
  YOUR_ACCOUNT_ID.dkr.ecr.ap-northeast-1.amazonaws.com/video-research-backend:latest

docker push YOUR_ACCOUNT_ID.dkr.ecr.ap-northeast-1.amazonaws.com/video-research-backend:latest
```

#### 步骤 2: 创建 ECS 任务定义

创建 `ecs-task-definition.json`:

```json
{
  "family": "video-research-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::YOUR_ACCOUNT_ID:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::YOUR_ACCOUNT_ID:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "video-research-backend",
      "image": "YOUR_ACCOUNT_ID.dkr.ecr.ap-northeast-1.amazonaws.com/video-research-backend:latest",
      "portMappings": [
        {
          "containerPort": 8080,
          "protocol": "tcp"
        }
      ],
      "environment": [
        { "name": "NODE_ENV", "value": "production" },
        { "name": "FRONTEND_URL", "value": "https://your-frontend-url.com" },
        { "name": "PORT", "value": "8080" }
      ],
      "secrets": [
        {
          "name": "SUPADATA_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:ap-northeast-1:YOUR_ACCOUNT_ID:secret:supadata-api-key"
        },
        {
          "name": "DASHSCOPE_BEIJING_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:ap-northeast-1:YOUR_ACCOUNT_ID:secret:dashscope-api-key"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/video-research-backend",
          "awslogs-region": "ap-northeast-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

注册任务:

```bash
aws ecs register-task-definition --cli-input-json file://ecs-task-definition.json
```

#### 步骤 3: 创建 ECS 服务

```bash
# 创建集群
aws ecs create-cluster --cluster-name video-research-cluster

# 创建服务
aws ecs create-service \
  --cluster video-research-cluster \
  --service-name video-research-backend \
  --task-definition video-research-backend \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxxx,subnet-yyyyyy],securityGroups=[sg-xxxxxx],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:ap-northeast-1:YOUR_ACCOUNT_ID:targetgroup/video-research-backend/xxxxxx,containerName=video-research-backend,containerPort=8080"
```

---

### 方案 3: Azure Container Apps

适合 Azure 生态用户。

```bash
# 创建资源组
az group create --name video-research-rg --location eastasia

# 创建 Container Registry
az acr create --resource-group video-research-rg --name videoresearchacr --sku Basic

# 登录 ACR
az acr login --name videoresearchacr

# 标记并推送镜像
docker tag video-research-backend videoresearchacr.azurecr.io/video-research-backend:latest
docker push videoresearchacr.azurecr.io/video-research-backend:latest

# 创建 Container Apps 环境
az containerapp env create \
  --name video-research-env \
  --resource-group video-research-rg \
  --location eastasia

# 部署 Container App
az containerapp create \
  --name video-research-backend \
  --resource-group video-research-rg \
  --environment video-research-env \
  --image videoresearchacr.azurecr.io/video-research-backend:latest \
  --target-port 8080 \
  --ingress external \
  --env-vars "NODE_ENV=production" "FRONTEND_URL=https://your-frontend-url.com" \
  --secrets "supadata-key=your-supadata-key" "dashscope-key=your-dashscope-key" \
  --secrets-env-vars "SUPADATA_API_KEY=supadata-key" "DASHSCOPE_BEIJING_API_KEY=dashscope-key"
```

---

### 方案 4: VPS / 独立服务器 (Docker Compose)

适合希望完全控制服务器的用户。

创建 `docker-compose.yml`:

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: video-research-backend
    restart: always
    ports:
      - "5000:8080"
    environment:
      - NODE_ENV=production
      - PORT=8080
      - SUPADATA_API_KEY=${SUPADATA_API_KEY}
      - DASHSCOPE_BEIJING_API_KEY=${DASHSCOPE_BEIJING_API_KEY}
      - FRONTEND_URL=${FRONTEND_URL}
      - FRONTEND_URLS=${FRONTEND_URLS}
      - USE_FIREBASE_AUTH=${USE_FIREBASE_AUTH:-true}
      - YOUTUBE_API_KEYS=${YOUTUBE_API_KEYS:-}
      - LOG_LEVEL=${LOG_LEVEL:-info}
    volumes:
      # 如果需要本地存储数据
      - ./data:/app/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # 可选: Nginx 反向代理
  nginx:
    image: nginx:alpine
    container_name: video-research-nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - backend
```

创建 `.env` 文件:

```bash
SUPADATA_API_KEY=your_supadata_api_key
DASHSCOPE_BEIJING_API_KEY=your_dashscope_api_key
FRONTEND_URL=https://your-frontend-url.com
FRONTEND_URLS=https://your-frontend-url.com,https://www.your-frontend-url.com
USE_FIREBASE_AUTH=true
LOG_LEVEL=info
```

部署:

```bash
# 复制项目到服务器
cd /opt/video-research

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f backend

# 更新部署
docker-compose pull && docker-compose up -d
```

---

## 前端部署

### 方案 1: Firebase Hosting (推荐)

适合与 Firebase 生态集成。

#### 步骤 1: 初始化 Firebase

```bash
cd frontend
npm install -g firebase-tools
firebase login
firebase init hosting
```

选择:
- 使用现有项目
- Public directory: `out` (Next.js 静态导出目录)
- 配置为单页应用: Yes

#### 步骤 2: 配置 Firebase Hosting

`firebase.json` 已配置:

```json
{
  "hosting": {
    "public": "out",
    "cleanUrls": true,
    "trailingSlash": true,
    "rewrites": [
      {
        "source": "/shared/**",
        "destination": "/shared/index.html"
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "/shared/**",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=3600, s-maxage=3600"
          }
        ]
      }
    ]
  }
}
```

#### 步骤 3: 构建与部署

```bash
# 安全构建 (自动使用 .env.production，忽略 .env.local)
npm run deploy:firebase

# 或手动步骤
npm run build:safe
firebase deploy --only hosting

# 首次部署需要更新 Firestore 索引
npm run deploy:firestore-indexes
```

---

### 方案 2: Vercel

适合 Next.js 项目，支持 Edge Functions。

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署
vercel --prod
```

配置 `vercel.json`:

```json
{
  "version": 2,
  "buildCommand": "npm run build:safe",
  "outputDirectory": "out",
  "framework": "nextjs",
  "env": {
    "NEXT_PUBLIC_API_URL": "https://your-backend-url.run.app",
    "NEXT_PUBLIC_USE_FIREBASE_AUTH": "true"
  }
}
```

---

### 方案 3: AWS S3 + CloudFront

适合需要 CDN 加速的场景。

```bash
# 构建
npm run build:safe

# 同步到 S3
aws s3 sync out/ s3://your-bucket-name --delete

# 刷新 CloudFront 缓存
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

---

### 方案 4: 独立服务器 (Nginx)

```bash
# 构建
npm run build:safe

# 复制构建产物到服务器
scp -r out/* user@your-server:/var/www/video-research/
```

Nginx 配置:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        root /var/www/video-research;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    # API 代理到后端
    location /api/ {
        proxy_pass http://localhost:5000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # SSE 特殊处理
    location /api/research/ {
        proxy_pass http://localhost:5000/api/research/;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s;
    }
}
```

---

## 数据库配置

### Firebase Firestore (推荐)

#### 1. 创建 Firebase 项目

1. 访问 [Firebase Console](https://console.firebase.google.com/)
2. 创建新项目
3. 启用 Firestore Database (选择地区如 `asia-southeast1`)
4. 设置安全规则

#### 2. 创建服务账号

```bash
# 在 Firebase Console > 项目设置 > 服务账号
# 生成新的私钥，下载 JSON 文件

# 或者使用 gcloud
gcloud iam service-accounts create firebase-sa \
  --display-name "Firebase Service Account"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member "serviceAccount:firebase-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role "roles/datastore.user"
```

#### 3. 配置 Firestore 索引

部署索引文件:

```bash
cd frontend
firebase deploy --only firestore:indexes
```

索引配置 `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "summaries",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "user_id", "order": "ASCENDING" },
        { "fieldPath": "created_at", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

---

### MongoDB Atlas (替代方案)

如果需要使用 MongoDB 替代 Firestore:

```bash
# 安装 Mongoose
npm install mongoose

# 连接字符串
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/video-research
```

修改 `config.yaml`:

```yaml
system:
  use_local_storage: false
  database_provider: mongodb
```

---

## 第三方服务配置

### 1. Supadata (必需)

用于 YouTube 视频搜索和字幕获取。

1. 注册: https://supadata.ai/
2. 获取 API Key
3. 添加到环境变量: `SUPADATA_API_KEY`

### 2. DashScope / 通义千问 (必需)

用于 AI 内容生成。

1. 注册: https://dashscope.aliyun.com/
2. 创建 API Key
3. 添加到环境变量: `DASHSCOPE_BEIJING_API_KEY`

计费说明:
- qwen-plus: 适合常规摘要生成
- qwen-max: 适合高质量研究总结 (费用更高)
- qwen-flash: 适合快速预处理 (费用最低)

### 3. Firebase Authentication (可选)

用于用户认证。

1. 在 Firebase Console 启用 Authentication
2. 启用 Google 登录提供者
3. 配置 OAuth 回调地址

### 4. YouTube Data API (可选)

用于获取视频元数据 (缩略图、标题等)。

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 启用 YouTube Data API v3
3. 创建 API Key
4. 添加到环境变量: `YOUTUBE_API_KEYS`

---

## 生产环境检查清单

### 部署前检查

- [ ] **API Keys**
  - [ ] SUPADATA_API_KEY 已设置且有效
  - [ ] DASHSCOPE_BEIJING_API_KEY 已设置且余额充足
  - [ ] YOUTUBE_API_KEYS 已设置 (如使用)

- [ ] **环境配置**
  - [ ] NODE_ENV=production
  - [ ] FRONTEND_URL 指向正确的域名
  - [ ] FRONTEND_URLS 包含所有允许的域名
  - [ ] CORS 配置正确

- [ ] **数据库**
  - [ ] Firestore 索引已部署
  - [ ] 服务账号权限正确
  - [ ] 数据库区域与后端一致

- [ ] **安全配置**
  - [ ] 生产环境禁用 AUTH_ENABLED=false
  - [ ] 使用 Secrets Manager 存储 API Keys
  - [ ] 日志级别设置为 info 或 warn (非 debug)

### 部署后验证

- [ ] **健康检查**
  ```bash
  curl https://your-backend-url.run.app/health
  ```

- [ ] **API 测试**
  ```bash
  curl -X POST https://your-backend-url.run.app/api/summary \
    -H "Content-Type: application/json" \
    -d '{"urls":["https://www.youtube.com/watch?v=dQw4w9WgXcQ"]}'
  ```

- [ ] **前端集成测试**
  - 访问前端页面
  - 测试研究流程
  - 验证 SSE 连接正常
  - 检查历史记录功能

- [ ] **监控与日志**
  - [ ] Cloud Run / ECS 日志正常
  - [ ] 错误率监控
  - [ ] 响应时间监控

### 性能优化建议

1. **启用 CDN**: 前端静态资源使用 CDN 加速
2. **压缩响应**: 后端启用 gzip 压缩
3. **缓存策略**: 合理配置 API 响应缓存
4. **连接池**: 后端使用 HTTP Keep-Alive
5. **自动扩缩容**: Cloud Run/ECS 配置基于请求的自动扩容

---

## 故障排查

### 后端启动失败

```bash
# 检查日志
gcloud run services logs read video-research-backend --region asia-southeast1

# 常见原因:
# 1. 环境变量缺失
# 2. API Keys 无效
# 3. 端口配置错误
```

### CORS 错误

```bash
# 验证 FRONTEND_URL 配置
gcloud run services describe video-research-backend --region asia-southeast1

# 确保前端域名与后端配置完全一致 (包括 https://)
```

### SSE 连接断开

```bash
# Cloud Run 需要配置长时间连接
gcloud run services update video-research-backend \
  --region asia-southeast1 \
  --timeout 300
```

### 数据库连接错误

```bash
# 检查服务账号权限
gcloud projects get-iam-policy YOUR_PROJECT_ID \
  --flatten="bindings[].members" \
  --format="table(bindings.role)" \
  --filter="bindings.members:firebase-adminsdk"
```

---

## 维护与更新

### 滚动更新策略

```bash
# 灰度发布: 先更新 10% 流量
gcloud run services update-traffic video-research-backend \
  --region asia-southeast1 \
  --to-revisions "LATEST=10,PREVIOUS=90"

# 验证无误后全量发布
gcloud run services update-traffic video-research-backend \
  --region asia-southeast1 \
  --to-latest
```

### 备份策略

```bash
# Firestore 自动备份 (需启用)
gcloud firestore operations export gs://your-backup-bucket
```

---

## 费用估算

| 服务 | 用量估算 | 月费用 (USD) |
|------|---------|-------------|
| Cloud Run | 100K 请求/月 | $0-5 (免费额度内) |
| Firestore | 1M 读/月, 100K 写/月 | $0-10 |
| Supadata | 10K 请求/月 | $0-29 |
| DashScope | 1M tokens/月 | $0-20 |
| Firebase Hosting | 10GB/月 | $0 (免费额度内) |
| **总计** | | **$0-64** |

---

## 参考资源

- [Google Cloud Run 文档](https://cloud.google.com/run/docs)
- [Firebase Hosting 文档](https://firebase.google.com/docs/hosting)
- [Supadata API 文档](https://docs.supadata.ai/)
- [DashScope 文档](https://help.aliyun.com/product/610313.html)

---

如有部署问题，请检查:
1. 环境变量是否正确设置
2. API Keys 是否有效
3. 服务账号权限是否正确
4. 网络配置 (防火墙、安全组) 是否允许流量
