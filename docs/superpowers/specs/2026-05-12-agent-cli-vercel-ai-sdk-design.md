# Agent CLI 练习项目设计规格

**日期：** 2026-05-12
**目标：** 用 Vercel AI SDK + Bun，逐个练习 agent CLI 的核心功能模块，每个功能独立脚本可单独运行。

---

## 背景与目标

通过 8 个独立 demo 脚本，覆盖 Vercel AI SDK 在 agent CLI 场景下的全部核心功能。每个脚本相互独立，无需理解其他脚本即可运行。参考对象为 opencode、Claude Code 等 agent CLI 工具。

---

## 技术栈

| 项目 | 选择 |
|------|------|
| 运行时 | Bun |
| AI SDK | Vercel AI SDK (`ai`) |
| Provider | `@ai-sdk/openai`（OpenAI-compatible，接 Kimi K2.6） |
| Schema | `zod` |
| 模型 | Kimi K2.6（用户提供 base URL 和 API key） |

---

## 项目结构

```
agent-demo/
  lib/
    ai.ts                    # provider 初始化（所有 demo 共用）
  demo-01-streaming.ts       # 流式输出
  demo-02-tool-use.ts        # 工具调用
  demo-03-agent-loop.ts      # agent 自主循环
  demo-04-multi-turn.ts      # 多轮对话
  demo-05-structured.ts      # 结构化输出
  demo-06-filesystem.ts      # 文件系统工具
  demo-07-bash.ts            # bash 执行工具
  demo-08-multi-provider.ts  # 多 provider 切换
  .env                       # 环境变量（不入 git）
  .env.example               # 环境变量示例（入 git）
  package.json
  tsconfig.json
```

---

## 环境变量

**.env 格式：**
```
KIMI_API_KEY=sk-xxx
KIMI_BASE_URL=https://xxx.kimi.ai/v1
KIMI_MODEL=kimi-k2-0711-preview
```

---

## 共用模块：lib/ai.ts

```ts
import { createOpenAI } from "@ai-sdk/openai"

export const kimi = createOpenAI({
  apiKey: process.env.KIMI_API_KEY!,
  baseURL: process.env.KIMI_BASE_URL!,
})

export const model = kimi(process.env.KIMI_MODEL ?? "kimi-k2-0711-preview")
```

所有 demo 从这里 import `model`，不在每个文件里重复初始化。

---

## Demo 列表与核心 API 映射

### demo-01-streaming.ts — 流式输出
- **API：** `streamText`
- **练习重点：** 消费 `textStream` async iterator，打印打字机效果
- **验证：** 终端逐字符输出，不等待完整响应

### demo-02-tool-use.ts — 工具调用
- **API：** `generateText` + `tools`
- **练习重点：** 用 Zod 定义 tool schema，读取 `toolCalls` 和 `toolResults`
- **验证：** 模型主动调用工具，控制台打印调用参数和结果

### demo-03-agent-loop.ts — agent 自主循环
- **API：** `generateText` + `tools` + `maxSteps`
- **练习重点：** 设置 `maxSteps`，观察模型多步推理直到任务完成
- **验证：** 控制台输出每一步的 toolCall → toolResult → 下一步

### demo-04-multi-turn.ts — 多轮对话
- **API：** `generateText` + `messages: CoreMessage[]`
- **练习重点：** 手动维护消息数组，每轮追加 user/assistant 消息
- **验证：** 模型能记住前几轮内容，回答带上下文引用

### demo-05-structured.ts — 结构化输出
- **API：** `generateObject` + Zod schema
- **练习重点：** 定义复杂 Zod schema，强制模型返回合法 JSON
- **验证：** 输出对象通过 Zod 解析，字段完整

### demo-06-filesystem.ts — 文件系统工具
- **API：** `generateText` + 自定义 `tool`（readFile / writeFile / listDir）
- **练习重点：** 用 Bun 原生 fs API 包装成 tool，让模型操作本地文件
- **验证：** 模型成功读取/写入/列出指定目录

### demo-07-bash.ts — bash 执行工具
- **API：** `generateText` + 自定义 `tool`（execBash）
- **练习重点：** 用 `Bun.spawnSync` 执行 shell 命令，返回 stdout/stderr
- **验证：** 模型成功执行简单命令（如 `ls`、`echo`、`date`）

### demo-08-multi-provider.ts — 多 provider 切换
- **API：** 多个 `createOpenAI({ baseURL })` 实例
- **练习重点：** 同一 prompt 发给两个不同配置的 provider 实例，对比输出；默认用 Kimi 同一 endpoint 的两个 model ID，用户可补充第二个 Provider 的 `PROVIDER2_BASE_URL` / `PROVIDER2_API_KEY`
- **验证：** 两个 provider 各自返回结果，控制台并排显示

---

## 每个 Demo 的代码约定

1. **文件顶部：** 一行注释说明练习目标
2. **中间：** 最小可运行示例，不做多余封装
3. **底部：** `console.log` 打印结果，方便观察

无测试框架——跑通即验证。

---

## 运行方式

```bash
bun demo-01-streaming.ts
bun demo-02-tool-use.ts
# ... 以此类推
```

---

## 不在范围内

- 完整的 CLI 入口（`commander` / `yargs` 等）
- 错误重试机制
- 日志持久化
- 单元测试
