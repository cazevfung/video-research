# Video Research 工具 · AI 使用心得分享 — Talking Points

> 基于本项目（Video Research Service）实践整理的司内分享要点，可直接用于写分享稿或演讲大纲。

---

## 一、分享定位（30 秒电梯版）

我们做的是一个 **AI 驱动的视频研报产品**：用户输入研究主题 → AI 生成研究问题与搜索词 → 拉取并筛选视频 → 抓稿 → AI 写多视角研报并带引用。  
分享重点不是「产品多厉害」，而是 **在做这个产品的过程中，如何用 AI 提效、又怎样约束和验证 AI 产出**，形成可复用的共识和方法。

---

## 二、产品与 AI 的交叉点（听众为什么该听）

- **产品本身就在用 AI**：多阶段 LLM 调用（问题生成 → 搜索词 → 视频筛选 → 研报生成）、流式输出、引用格式约束。
- **做产品的过程也在用 AI**：架构设计、接口设计、PRD/实现计划、Bug 排查、测试方案、文档补全。
- 因此既有「**用 AI 做功能**」的心得，也有「**用 AI 写代码/写文档**」的心得，两条线可以一起讲，突出「**约束 + 解析 + 验证**」的闭环。

---

## 三、建议的 Talking Points（按分享顺序）

### 1. 共识先行：我们怎么看待「人 vs AI」的分工

- **人对结果负最终责任**：研报质量、引用正确性、策略与合规，都是人兜底。
- **先有方案再让 AI 开工**：例如多阶段研究流程（问题 → 搜索词 → 视频 → 稿 → 研报）、状态机、SSE 事件设计，都是先定好再让 AI 填实现或文档。
- **AI 负责在边界内执行**：写 prompt、写单测、写某一段业务逻辑、按 PRD 写实现计划；不交给 AI 做架构级决策或「自由发挥一整块系统」。

**可复用金句**：  
「我们不是让 AI 替我们想方案，而是让 AI 在我们已经画好的框里把代码和文档写满。」

---

### 2. 让 AI 理解「我们是谁、在做什么」—— 项目信息与上下文

- **PRD + 实现计划当说明书**：  
  `AI_RESEARCH_FEATURE_PRD.md`、`enhanced_research_workflow_implementation_plan.md` 等描述了流程、状态、接口；和 AI 协作时直接 @ 这些文件，减少「从零解释业务」的成本。
- **目录与模块说明**：  
  `backend/README.md`、`frontend/README.md`、各 `docs/*.md` 说明模块职责和入口，方便 AI 改代码时不跑错目录。
- **Bug 与修复有单独文档**：  
  如 `bugfix-smart-research-feedback-parsing.md`、`RACE_CONDITION_SUMMARY.md`、`CITATION_DEBUGGING_GUIDE.md`，既给人看也给 AI 看，避免同一类问题重复解释。

**可复用要点**：  
把「项目结构 + 关键 PRD/设计 doc + 已知坑与修复」做成 AI 可读的上下文，新需求或修 Bug 时先喂这些再提问，一次做对的概率会高很多。

---

### 3. 约束 AI 产出质量（一）—— Prompt 里的「强约束」

- **多阶段、多文件的 Prompt 设计**：  
  - `backend/src/prompts/research/`：  
    - `question-generation.md` / `question-regeneration.md`（问题生成与带反馈的再生）  
    - `search-term-genration.md`（搜索词）  
    - `video-filtering.md` / `video-filtering-regeneration.md`（视频筛选）  
    - `research-summary.md`（研报）  
  - `citation-instructions.md`：统一引用格式为 `[1]`、`[2]`，禁止「视频1」「Video 1」等自然语言引用。
- **每一阶段都有「CRITICAL OUTPUT REQUIREMENT」**：  
  - 明确写「只输出 xxx，不要解释、不要 meta-commentary、不要 reasoning」；  
  - 例如搜索词：只输出编号列表，不要 "Note:" / "Explanation:"；  
  - 例如问题再生：只输出 JSON 或编号问题列表，不要 "Preserved valid questions" 这类说明。
- **业务规则写进 Prompt**：  
  如 `video-filtering.md` 里的可信度规则（按时间 + 播放量拒绝低质视频）、时间相关性（近期事件优先近期视频）等，让模型按规则选视频而不是自由发挥。

**可复用要点**：  
「强约束」= 输出格式 + 禁止项 + 业务规则都写在 Prompt 里，并且用「CRITICAL / MUST / DO NOT」级别表述，减少歧义。

---

### 4. 约束 AI 产出质量（二）—— 解析层「防御性编程」

- **AI 不会 100% 遵守格式**：  
  真实案例见 `bugfix-smart-research-feedback-parsing.md`：用户反馈「特鲁多已经不是加拿大首相」后，AI 在问题再生时输出了 5 个正确问题 + 一大段解释（如 "Preserved valid questions"、"Corrected flawed premise"），解析器把解释也当成了「问题」，导致 UI 展示 15 条。
- **应对方式**：  
  - **Prompt 侧**：在 `question-regeneration.md` 等里加强「CRITICAL OUTPUT REQUIREMENT」，明确禁止 meta-commentary。  
  - **解析侧**：在 `parseQuestionsFromAI` 里增加过滤——跳过以 `**` 开头、或包含 "preserved" / "corrected" / "updated" / "maintained" / "enhanced" 等典型解释用词的行；对编号列表再做一次「像不像真正问题」的简单启发式（长度、句式）。  
  - 同理，`parseSearchTermsFromAI` 也只认「纯搜索词行」，不认说明性文字。
- **多格式兼容**：  
  `parseQuestionsFromAI` 支持：JSON 对象 `{ "questions": [...] }`、JSON 数组 `["q1","q2"]`、编号列表 `1. xxx`；先尝试 JSON，再 fallback 到行解析，既兼容模型有时输出 JSON 有时输出列表，又通过过滤降低「脏数据」进库的概率。

**可复用金句**：  
「Prompt 约束是上限，解析层是兜底：假设 AI 会多输出、少输出或换格式，解析要容错且严格过滤非目标内容。」

---

### 5. 引用（Citation）全链路：从 Prompt 到前端展示

- **需求**：  
  研报里引用必须统一为 `[1]`、`[2]`，且可点击、可悬停看视频信息，共享页也要正确展示。
- **做法**：  
  - **Prompt**：`citation-instructions.md` 注入到研报生成 prompt，明确「只能用 [1][2][3]，禁止其他形式」，并注入当前任务的 `videoReferences`（视频序号与元信息）。  
  - **后端**：  
    - `citation-mapper.service`：根据当前选中的视频列表生成 citation 元数据（编号 → videoId、标题、频道等）；  
    - `citation-parser.service`：在流式输出中实时解析 `[1]`、`[1,3]`、`[1-4]` 等，校验编号是否在合法范围内，并按 section 统计引用，供前端高亮与跳转。  
  - **前端**：  
    根据 citation 元数据把 `[1]` 渲染成可点击/悬停的组件；共享页从 API 拉取同一份 research 数据（含 citations），保证和主站一致。
- **可讲的心得**：  
  - 引用格式要在「写研报的 Prompt」里强约束，否则模型会混用「视频1」「Source 1」等，后期很难统一清洗。  
  - 引用解析和校验放在后端、与流式输出同一条链路，便于复用和测试；前端只负责展示与交互。

**可复用要点**：  
「格式约束在 Prompt → 结构化解析与校验在服务端 → 前端只消费结构化数据」，适合所有「AI 输出需要严格格式」的场景。

---

### 6. 状态与一致性：多阶段流程 + 防重复

- **多阶段研究流程**：  
  created → generating_questions → awaiting_question_approval → … → generating_summary → completed；中间还有 regenerating_questions、refiltering_videos 等。  
  用 `research-state-validator` 做状态机校验，避免非法跃迁（例如从未 approved 直接到 generating_summary）。
- **Race 与防重复**：  
  `RACE_CONDITION_SUMMARY.md` 里分析过：用户快速多次点「开始研究」会创建多个重复任务；解决思路包括「按钮防抖 + 请求 in-flight 标记」、后端幂等等。  
  和 AI 协作时，这类问题适合先由人定方案（状态机图、防重复策略），再让 AI 实现具体代码或补测试用例。

**可复用要点**：  
多阶段、多任务的功能，先把「状态有哪些、允许怎么跳转、哪里要防重复」讲清楚（最好有 doc），再让 AI 写实现，比直接说「帮我实现研究流程」稳得多。

---

### 7. 可观测与排错：日志、进度、SSE

- **日志**：  
  关键步骤打点（如「开始/完成问题生成」「开始/完成视频筛选」「citation 解析 invalid」），方便排查「卡在哪一阶段」「AI 输出了什么」。
- **进度与 SSE**：  
  各阶段有 progress 百分比和 message，通过 SSE 推给前端，用户能看到「正在生成问题」「正在筛选视频」等，而不是白屏等待；同时便于定位「前端显示到哪一步了」。
- **调试文档**：  
  如 `CITATION_DEBUGGING_GUIDE.md` 写清：共享页引用不显示时，先看 Network 里 `research.citations` 有没有、再看前端 CitationProvider 的 state；这样以后同类问题可以交给 AI 按文档排查。

**可复用要点**：  
AI 参与写的 pipeline，一定要留「阶段清晰 + 日志 + 可观测进度」，否则线上问题很难复现和交给 AI 一起查。

---

### 8. 一次真实「翻车」与改进（建议必讲）

- **案例**：  
  用户反馈「特鲁多已经不是加拿大首相」后，AI 在问题再生时返回了 5 个正确问题 + 多段解释，解析器把解释当问题，UI 出现 15 条。
- **原因归纳**：  
  - Prompt 没有强调「禁止附带 reasoning / meta-commentary」；  
  - 解析器对「编号 + 文本」过于宽容，没有过滤明显不是问题的行。
- **改进**：  
  - 在所有「只想要结构化输出」的 prompt 里加上 **CRITICAL OUTPUT REQUIREMENT**，并举例「不要写什么」；  
  - 增强 `parseQuestionsFromAI` / `parseSearchTermsFromAI`：关键词过滤 + 简单启发式，避免解释性文字进入业务数据。
- **教训**：  
  「AI 会『好心』地给你解释和总结，若下游是解析器，就必须在 Prompt 和解析两侧同时设防。」

---

### 9. 测试与回归

- **单测**：  
  对解析逻辑（如 `parseQuestionsFromAI`、citation parser）写单测，覆盖：纯 JSON、纯编号列表、带 meta-commentary 的脏数据、边界情况（空、单条、超长）。  
  这样以后改 Prompt 或解析规则时，能快速回归。
- **Research 流程的脚本/手动测试**：  
  `TESTING_STYLE_GUIDE.md`、`npm run test:research` 等，保证「从问题生成到研报输出」的整条链路可测；和 AI 协作时，可以说「按这个 guide 测一遍再交」。

**可复用要点**：  
「AI 会改动的」部分（尤其是解析、格式化、校验）要有自动化测试，避免改一处坏另一处。

---

### 10. 小结：三句可带走的结论

1. **方案人定、执行 AI 做**：多阶段流程、状态机、接口形态先想清楚并写成 doc，再让 AI 填实现和文档。  
2. **约束在 Prompt、兜底在解析**：用「CRITICAL OUTPUT REQUIREMENT + 业务规则」提高一次做对率；用防御性解析和过滤应对 meta-commentary 和格式漂移。  
3. **可观测 + 测试**：阶段清晰、打点日志、SSE 进度；解析与关键路径有单测和回归方式，这样 AI 参与写的代码也敢上线、好排错。

---

## 四、分享时可用的结构建议

| 部分           | 时长建议 | 内容 |
|----------------|----------|------|
| 开场           | 1 min    | 产品一句话 + 今天讲「做这个产品时的 AI 使用心得」。 |
| 共识           | 2 min    | 人负责方案与责任，AI 负责在边界内执行。 |
| 让 AI 理解我们 | 2 min    | PRD/实现计划/目录说明/Bug 文档当上下文。 |
| 强约束         | 3 min    | 多阶段 Prompt、CRITICAL OUTPUT、citation 格式。 |
| 防御性解析     | 3 min    | 问题再生 15 条翻车案例 + parseQuestionsFromAI 的过滤与多格式兼容。 |
| Citation 链路  | 2 min    | 从 Prompt 到 mapper/parser 再到前端的闭环。 |
| 状态与防重复   | 1 min    | 状态机 + race 修复，方案人定、实现可交给 AI。 |
| 可观测与测试   | 1 min    | 日志、SSE、调试 doc；解析单测 + research 回归。 |
| 小结           | 1 min    | 三句可带走的结论。 |

总长约 15–20 分钟，可按现场时长删减「Citation 链路」或「状态与防重复」等段落，保留「共识 + 强约束 + 防御性解析 + 翻车案例」作为核心。

---

## 五、若听众追问可展开的点

- **Prompt 模板怎么维护**：  
  我们按阶段拆成多个 `.md`，用占位符（如 `{researchQuery}`、`{questions_section}`）在代码里拼接，便于单独改某一阶段的文案和规则。
- **为什么用 Qwen/DashScope**：  
  结合公司技术栈与合规要求选型；Prompt 设计是模型无关的，换模型时主要调温度和长度等参数。
- **流式输出下的 citation**：  
  边收 token 边用 citation-parser 做增量解析与校验，保证最终研报里的引用编号都在合法范围内，并记录 per-section 的引用用于前端。

---

*文档基于当前仓库的 PRD、实现计划、Bugfix 文档与代码整理，可直接用于司内分享稿或演讲大纲。*
