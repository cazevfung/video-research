# AI 视频研究助手

一个基于 AI 的 YouTube 视频智能研究平台，用户只需输入研究主题，系统即可自动搜索、筛选相关视频，并生成多维度、结构化的深度研究报告。

---

## 项目概述

本项目是一个全栈应用，包含前端 (Next.js) 和后端 (Node.js/Express)，利用 AI 技术实现从研究主题到结构化报告的全自动化工作流。

### 核心功能

1. **智能研究流程** - 用户输入主题，AI 自动生成研究问题、搜索视频、筛选内容、生成报告
2. **人机协作反馈** - 关键决策点引入用户反馈，确保研究方向符合用户预期
3. **多语言支持** - 支持 12+ 语言界面和内容输出
4. **实时进度推送** - 基于 SSE (Server-Sent Events) 的实时进度更新
5. **访客模式** - 无需注册即可体验核心功能

---

## 工作流设计

本项目采用**分层递进式人机协作工作流**，在自动化与用户体验之间取得平衡。

### 核心设计理念

```
┌─────────────────────────────────────────────────────────────────┐
│                    人机协作研究流程                              │
├─────────────────────────────────────────────────────────────────┤
│  传统方式                          我们的方案                     │
│  ┌──────────┐                     ┌──────────────────────┐       │
│  │ 用户找视频 │ ──→ 完全手动       │ 用户输入主题           │       │
│  │ 手动筛选  │                     │ ↓                    │       │
│  │ 手动观看  │                     │ AI 自动生成研究问题    │       │
│  │ 手动总结  │                     │ ↓ [用户确认/反馈]      │       │
│  └──────────┘                     │ AI 生成搜索关键词      │       │
│                                   │ ↓ [用户确认/反馈]      │       │
│                                   │ 自动搜索相关视频       │       │
│                                   │ ↓                    │       │
│                                   │ AI 智能筛选视频        │       │
│                                   │ ↓ [用户确认/反馈]      │       │
│                                   │ 获取视频字幕          │       │
│                                   │ ↓                    │       │
│                                   │ AI 生成研究报告        │       │
│                                   │ ↓                    │       │
│                                   │ 结构化报告展示         │       │
│                                   └──────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

### 详细工作流

#### 阶段 1：研究问题生成 (Research Question Generation)

```
用户输入研究主题
    ↓
AI 发散思维：从多角度生成 15-25 个候选问题
    ↓
AI 收敛筛选：选出 5 个核心问题
    ↓
用户审核：可批准或提供反馈
    ↓
（若反馈）AI 一次性重新生成 → 进入下一阶段
```

**设计要点**：
- 发散-收敛两阶段确保问题全面且不冗余
- 用户拥有**一次反馈机会**，防止无限循环
- 问题覆盖 who/what/when/where/why/how 多个维度

#### 阶段 2：搜索关键词生成 (Search Term Generation)

```
用户批准的研究问题
    ↓
AI 生成 5 个 YouTube 优化搜索词
    ↓
用户审核：可批准或提供反馈
    ↓
（若反馈）AI 一次性重新生成 → 进入下一阶段
```

**设计要点**：
- 每个搜索词针对不同角度，确保搜索结果多样性
- 包含时间限定词（如 "2024"、"latest"）确保时效性

#### 阶段 3：视频搜索与筛选 (Video Search & Filtering)

```
搜索关键词
    ↓
Supadata API 搜索 (每个词 10 个结果，共 50 个视频)
    ↓
AI 智能筛选：基于权威性、时效性、观点多样性选出 10 个
    ↓
用户审核：查看选中视频及理由，可批准或提供反馈
    ↓
（若反馈）AI 一次性重新筛选 → 进入下一阶段
```

**筛选维度**：
| 维度 | 说明 |
|------|------|
| 直接相关 (Direct) | 直接回答研究问题 |
| 间接相关 (Indirect) | 提供背景或相关案例 |
| 对立观点 (Contradictory) | 提供不同视角，确保平衡性 |

#### 阶段 4：转录与总结 (Transcription & Summarization)

```
选中的 10 个视频
    ↓
批量获取字幕 (Supadata API)
    ↓
AI 基于 5 个研究问题生成结构化报告
    ↓
最终报告展示 (含引用来源)
```

**报告结构**：
1. **核心要点** - 一句话总结主题核心论点
2. **关键发现** - 来自所有视频的惊人数据/转变
3. **问题解答** - 5 个研究问题分别作答 (H2 章节)
4. **引用来源** - 每个观点标注来源视频

---

## 系统架构

### 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         前端 (Next.js)                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   研究页面    │  │   实时进度    │  │     结果展示         │  │
│  │  Research    │  │  SSE 连接    │  │   Markdown 报告     │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│         ↓                   ↓                    ↓            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  共享组件 (80%+ 复用)                     │  │
│  │  认证、主题、语言、导航、按钮、卡片、错误处理、动画       │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ API 调用 / SSE 连接
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     后端 (Node.js/Express)                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   研究服务 (Research Service)             │  │
│  │  工作流编排、状态管理、进度推送、错误处理                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│         ↓              ↓              ↓              ↓          │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   │
│  │ 问题服务  │   │ 搜索服务  │   │ 筛选服务  │   │ 总结服务  │   │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘   │
│         ↓              ↓              ↓              ↓          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   外部 API 集成                          │  │
│  │  Supadata (YouTube)  │  Qwen/DashScope (AI)  │  Firebase │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 技术栈

| 层级 | 技术 | 用途 |
|------|------|------|
| 前端框架 | Next.js 16 + React 19 | SSR、路由、组件 |
| 前端状态 | React Hooks + Context | 本地状态管理 |
| 前端样式 | Tailwind CSS + Framer Motion | 样式与动画 |
| 后端框架 | Node.js + Express + TypeScript | API 服务 |
| 数据库 | Firebase Firestore | 文档存储 |
| 认证 | Passport.js (Google OAuth) + JWT | 用户认证 |
| AI 模型 | Qwen-Plus / Qwen-Max (通义千问) | 内容生成 |
| YouTube 数据 | Supadata API | 视频搜索与字幕 |
| 实时通信 | SSE (Server-Sent Events) | 进度推送 |
| 部署 | Firebase Hosting (前端) + Cloud Run (后端) | 云部署 |

---

## 关键技术设计

### 1. SSE 实时进度推送

为了解决长时间 AI 处理的用户等待焦虑，系统采用 SSE 实现真正的实时进度更新：

```
用户提交研究请求
    ↓
后端立即返回 job_id
    ↓
前端建立 SSE 连接到 /api/research/:job_id/status
    ↓
后端在每个阶段完成后推送进度 (progress + status + data)
    ↓
前端实时更新 UI，用户看到具体进展
```

**SSE 消息格式**：
```typescript
{
  status: 'generating_queries' | 'awaiting_question_approval' | ...,
  progress: 10,  // 0-100
  message: '正在生成研究问题...',
  research_data: {
    generated_questions?: string[],  // 阶段 1 数据
    generated_terms?: string[],        // 阶段 2 数据
    selected_videos?: Video[],       // 阶段 3 数据
    final_summary?: string,          // 完成数据
    requires_user_input?: boolean,   // 是否需要用户反馈
    feedback_stage?: string,         // 当前反馈阶段
  }
}
```

### 2. 状态机设计

研究任务采用严格的状态机管理，防止竞态条件和状态混乱：

```typescript
type ResearchStatus =
  | 'pending'                    // 初始状态
  | 'generating_questions'        // AI 生成问题中
  | 'awaiting_question_approval'  // 等待用户确认问题
  | 'regenerating_questions'      // AI 重新生成问题中
  | 'generating_terms'            // AI 生成搜索词中
  | 'awaiting_term_approval'      // 等待用户确认搜索词
  | 'regenerating_terms'          // AI 重新生成搜索词
  | 'searching_videos'            // 搜索视频中
  | 'filtering_videos'            // AI 筛选视频中
  | 'awaiting_video_approval'     // 等待用户确认视频
  | 'refiltering_videos'          // AI 重新筛选视频
  | 'fetching_transcripts'        // 获取字幕中
  | 'generating_summary'          // 生成报告中
  | 'completed'                   // 完成
  | 'error';                      // 错误
```

### 3. 人机协作反馈机制

每个反馈阶段的设计遵循以下原则：
- **一次性反馈机会**：防止无限循环，保证效率
- **结构化反馈**：用户选择预定义选项（如 "太宽泛"、"太技术"）而非自由输入
- **上下文保留**：AI 重新生成时保留用户原始意图

```
用户反馈选项（问题阶段示例）：
- 覆盖角度不够全面
- 问题过于宽泛，需要更具体
- 问题过于技术化/专业化
- 需要更多实践案例相关问题
- 需要更多背景/历史相关问题
```

### 4. Prompt 工程体系

采用分层 Prompt 设计，确保输出质量：

```
prompts/
├── research/
│   ├── question-generation.md      # 发散-收敛两阶段问题生成
│   ├── question-regeneration.md    # 基于反馈重新生成问题
│   ├── search-term-generation.md   # YouTube 优化搜索词生成
│   ├── video-filtering.md          # 多维度视频筛选
│   ├── video-filtering-regeneration.md  # 基于反馈重新筛选
│   └── research-summary.md         # 结构化报告生成
└── general/
    └── citation-instructions.md    # 引用格式规范
```

每个 Prompt 包含：
- **角色定义** - AI 扮演的角色（研究助手、筛选专家等）
- **输入数据** - 用户查询、视频列表、转录文本等
- **处理规则** - 详细的处理步骤和约束条件
- **输出格式** - 严格的 JSON 或 Markdown 格式要求

### 5. 引用溯源系统

为保证报告可信度，每个观点都标注来源：

```markdown
根据多个视频分析，AI 在医疗诊断中的准确率已达到 95% 以上 [1][3]。
然而，这一数据主要来源于实验室环境，实际临床应用中仍面临挑战 [2]。

---
**参考来源**

[1] How AI Is Transforming Healthcare in 2024 - CNBC
[2] The Reality of AI Implementation in Hospitals - MedTech Weekly
[3] AI Diagnosis Accuracy: Lab vs. Real World - Health Innovation Summit
```

---

## 项目结构

```
.
├── frontend/                    # Next.js 前端应用
│   ├── src/
│   │   ├── app/                 # 页面路由
│   │   ├── components/          # 共享组件
│   │   ├── hooks/               # 自定义 Hooks
│   │   ├── locales/             # i18n 翻译文件 (12+ 语言)
│   │   └── lib/                 # 工具函数
│   └── package.json
│
├── backend/                     # Node.js 后端服务
│   ├── src/
│   │   ├── controllers/         # API 控制器
│   │   ├── services/            # 业务逻辑服务
│   │   ├── prompts/             # AI Prompt 模板
│   │   ├── routes/              # 路由定义
│   │   └── models/              # 数据模型
│   └── package.json
│
├── docs/                        # 项目文档
│   ├── AI_RESEARCH_FEATURE_PRD.md              # 后端 PRD
│   ├── AI_RESEARCH_FEATURE_FRONTEND_PRD.md     # 前端 PRD
│   ├── enhanced_research_workflow_prd.md       # 增强工作流 PRD
│   └── implementation_complete/              # 实现完成文档
│
└── README.md                    # 本文件
```

---

## 开发指南

### 环境要求

- Node.js 18+
- Firebase 项目（数据库和认证）
- Supadata API Key
- DashScope API Key (通义千问)

### 本地开发

```bash
# 1. 克隆项目
cd "Video Research"

# 2. 安装后端依赖
cd backend
npm install

# 3. 配置后端环境变量
cp .env.example .env
# 编辑 .env 填入 API Keys

# 4. 启动后端开发服务器
npm run dev

# 5. 新终端 - 安装前端依赖
cd ../frontend
npm install

# 6. 配置前端环境变量
cp .env.local.example .env.local
# 编辑 .env.local 填入配置

# 7. 启动前端开发服务器
npm run dev
```

### 构建与部署

```bash
# 前端构建
frontend$ npm run build:safe

# 后端构建
backend$ npm run build

# 部署到 Firebase (前端)
frontend$ npm run deploy:firebase

# 部署到 Cloud Run (后端)
backend$ gcloud run deploy ...
```

---

## 工作流演进

本项目工作流经历了多次迭代优化：

| 版本 | 特点 | 问题 | 解决方案 |
|------|------|------|----------|
| V1 | 完全自动化，无用户干预 | 用户无法纠正方向 | 引入 3 个反馈节点 |
| V2 | 无限反馈循环 | 流程过长，体验差 | 限制每阶段 1 次反馈 |
| V3 | 结构化反馈选项 | 反馈质量不一 | 预定义选项 + 简短输入 |
| V4 | 当前版本 | 平衡自动化与控制 | 分层递进 + 状态机 |

---

## 贡献指南

1. **文档优先**：任何功能改动需先更新 PRD 文档
2. **类型安全**：全项目 TypeScript，严格类型检查
3. **测试覆盖**：核心服务需有单元测试
4. **i18n 考虑**：新增 UI 文本需同步添加所有语言文件

---

## 许可证

ISC License

---

## 致谢

- 通义千问 (Qwen) - AI 能力支持
- Supadata - YouTube 数据 API
- Firebase - 后端基础设施
