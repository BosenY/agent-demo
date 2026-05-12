# Agent CLI Vercel AI SDK 练习 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用 Vercel AI SDK + Bun 创建 8 个独立 demo 脚本，逐个练习 agent CLI 核心功能（流式输出、工具调用、agent 循环、多轮对话、结构化输出、文件系统、bash 执行、多 provider）。

**Architecture:** 平铺结构，每个 demo 是一个独立的 `.ts` 文件，可单独 `bun demo-xx.ts` 运行。所有 demo 共享 `lib/ai.ts` 中初始化的 provider 实例，不重复配置。

**Tech Stack:** Bun · Vercel AI SDK (`ai`) · `@ai-sdk/openai` (OpenAI-compatible, Kimi K2.6) · `zod`

---

## 文件结构

| 文件 | 职责 |
|------|------|
| `package.json` | 依赖声明 + bun 配置 |
| `tsconfig.json` | TypeScript 配置 |
| `.env.example` | 环境变量模板（入 git） |
| `.gitignore` | 忽略 `.env` |
| `lib/ai.ts` | 初始化 kimi provider，导出 `model` |
| `demo-01-streaming.ts` | `streamText` 流式输出 |
| `demo-02-tool-use.ts` | `generateText` + tools 工具调用 |
| `demo-03-agent-loop.ts` | `generateText` + tools + `maxSteps` agent 循环 |
| `demo-04-multi-turn.ts` | `generateText` + `CoreMessage[]` 多轮对话 |
| `demo-05-structured.ts` | `generateObject` + Zod schema 结构化输出 |
| `demo-06-filesystem.ts` | 自定义 readFile/writeFile/listDir tool |
| `demo-07-bash.ts` | 自定义 execBash tool |
| `demo-08-multi-provider.ts` | 两个 provider 实例对比输出 |

---

## Task 1: 项目初始化

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.env.example`
- Create: `.gitignore`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "agent-demo",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "devDependencies": {
    "@types/bun": "latest"
  },
  "dependencies": {
    "ai": "^4.3.0",
    "@ai-sdk/openai": "^1.3.0",
    "zod": "^3.23.0"
  }
}
```

- [ ] **Step 2: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

- [ ] **Step 3: 创建 .env.example**

```
KIMI_API_KEY=sk-xxx
KIMI_BASE_URL=https://api.moonshot.cn/v1
KIMI_MODEL=kimi-k2-0711-preview

# 可选：demo-08 第二个 provider
PROVIDER2_API_KEY=
PROVIDER2_BASE_URL=
PROVIDER2_MODEL=
```

- [ ] **Step 4: 创建 .gitignore**

```
.env
node_modules/
```

- [ ] **Step 5: 安装依赖**

```bash
bun install
```

期望输出：`bun install` 完成，生成 `bun.lockb`，`node_modules/` 中出现 `ai`、`@ai-sdk`、`zod`。

- [ ] **Step 6: 创建 .env（填入真实值）**

复制 `.env.example` 为 `.env`，将用户提供的 `KIMI_API_KEY` 和 `KIMI_BASE_URL` 填入。

---

## Task 2: 共用模块 lib/ai.ts

**Files:**
- Create: `lib/ai.ts`

- [ ] **Step 1: 创建 lib/ai.ts**

```ts
// 初始化 Kimi provider，供所有 demo import
import { createOpenAI } from "@ai-sdk/openai"

export const kimi = createOpenAI({
  apiKey: process.env.KIMI_API_KEY!,
  baseURL: process.env.KIMI_BASE_URL!,
})

export const model = kimi(process.env.KIMI_MODEL ?? "kimi-k2-0711-preview")
```

- [ ] **Step 2: 验证类型检查通过**

```bash
bun tsc --noEmit lib/ai.ts
```

期望输出：无报错。

---

## Task 3: demo-01 — 流式输出 (streamText)

**Files:**
- Create: `demo-01-streaming.ts`

- [ ] **Step 1: 创建 demo-01-streaming.ts**

```ts
// 练习目标：用 streamText 消费 textStream，实现打字机效果
import { streamText } from "ai"
import { model } from "./lib/ai"

const { textStream } = streamText({
  model,
  prompt: "用中文写一首关于编程的四行小诗。",
})

process.stdout.write("\n")
for await (const chunk of textStream) {
  process.stdout.write(chunk)
}
process.stdout.write("\n")
```

- [ ] **Step 2: 运行并观察**

```bash
bun demo-01-streaming.ts
```

期望输出：终端逐字/逐词打印诗句，字符流式出现，不会等待完整响应后一次性打印。

---

## Task 4: demo-02 — 工具调用 (generateText + tools)

**Files:**
- Create: `demo-02-tool-use.ts`

- [ ] **Step 1: 创建 demo-02-tool-use.ts**

```ts
// 练习目标：定义 Zod tool schema，让模型主动调用工具，读取 toolCalls / toolResults
import { generateText, tool } from "ai"
import { z } from "zod"
import { model } from "./lib/ai"

const result = await generateText({
  model,
  prompt: "查询北京和上海今天的天气。",
  tools: {
    getWeather: tool({
      description: "查询某个城市今天的天气",
      parameters: z.object({
        city: z.string().describe("城市名称，例如：北京"),
      }),
      execute: async ({ city }) => {
        // 模拟返回天气数据
        const data: Record<string, string> = {
          北京: "晴，26°C，东南风 3 级",
          上海: "多云，23°C，东风 2 级",
        }
        return data[city] ?? `${city}: 暂无数据`
      },
    }),
  },
})

console.log("\n=== toolCalls ===")
console.log(JSON.stringify(result.toolCalls, null, 2))

console.log("\n=== toolResults ===")
console.log(JSON.stringify(result.toolResults, null, 2))

console.log("\n=== 最终回复 ===")
console.log(result.text)
```

- [ ] **Step 2: 运行并观察**

```bash
bun demo-02-tool-use.ts
```

期望输出：
- `toolCalls` 数组中出现 `getWeather` 的两次调用（北京、上海）
- `toolResults` 中出现对应天气字符串
- `text` 为模型基于天气数据给出的自然语言回复

---

## Task 5: demo-03 — agent 自主循环 (maxSteps)

**Files:**
- Create: `demo-03-agent-loop.ts`

- [ ] **Step 1: 创建 demo-03-agent-loop.ts**

```ts
// 练习目标：设置 maxSteps，观察模型多步推理——自主决定何时调用工具、何时停止
import { generateText, tool } from "ai"
import { z } from "zod"
import { model } from "./lib/ai"

let stepIndex = 0

const result = await generateText({
  model,
  prompt: "帮我计算：先算 12 * 34，再用结果加上 56，最后告诉我答案。",
  tools: {
    calculate: tool({
      description: "执行简单的数学计算，支持 +、-、*、/ 运算",
      parameters: z.object({
        expression: z.string().describe("数学表达式，例如：12 * 34"),
      }),
      execute: async ({ expression }) => {
        // 安全地计算简单表达式
        const result = Function(`"use strict"; return (${expression})`)()
        return String(result)
      },
    }),
  },
  maxSteps: 5,
  onStepFinish: ({ text, toolCalls, toolResults, finishReason }) => {
    stepIndex++
    console.log(`\n--- Step ${stepIndex} (finishReason: ${finishReason}) ---`)
    if (toolCalls.length > 0) {
      console.log("toolCalls:", JSON.stringify(toolCalls, null, 2))
      console.log("toolResults:", JSON.stringify(toolResults, null, 2))
    }
    if (text) console.log("text:", text)
  },
})

console.log("\n=== 最终回复 ===")
console.log(result.text)
console.log(`\n共执行了 ${result.steps.length} 步`)
```

- [ ] **Step 2: 运行并观察**

```bash
bun demo-03-agent-loop.ts
```

期望输出：
- Step 1：调用 `calculate("12 * 34")`，结果 408
- Step 2：调用 `calculate("408 + 56")`，结果 464
- Step 3：模型输出最终回复，finishReason 为 `stop`
- 最终打印 `共执行了 3 步`

---

## Task 6: demo-04 — 多轮对话 (CoreMessage[])

**Files:**
- Create: `demo-04-multi-turn.ts`

- [ ] **Step 1: 创建 demo-04-multi-turn.ts**

```ts
// 练习目标：手动维护 CoreMessage[] 消息数组，实现跨轮次上下文记忆
import { generateText } from "ai"
import type { CoreMessage } from "ai"
import { model } from "./lib/ai"

const messages: CoreMessage[] = []

async function chat(userInput: string): Promise<string> {
  messages.push({ role: "user", content: userInput })

  const result = await generateText({ model, messages })

  messages.push({ role: "assistant", content: result.text })
  return result.text
}

// 第 1 轮：自我介绍
const r1 = await chat("你好，我叫新语，我是一名全栈工程师。")
console.log("\n[第 1 轮] 模型：", r1)

// 第 2 轮：追问细节
const r2 = await chat("我最近在学 Vercel AI SDK，你能推荐几个练习方向吗？")
console.log("\n[第 2 轮] 模型：", r2)

// 第 3 轮：验证记忆
const r3 = await chat("你还记得我叫什么名字吗？我的职业是什么？")
console.log("\n[第 3 轮] 模型：", r3)

console.log("\n=== 消息历史（共", messages.length, "条）===")
messages.forEach((m, i) => {
  const preview = typeof m.content === "string" ? m.content.slice(0, 60) : "[复杂内容]"
  console.log(`[${i + 1}] ${m.role}: ${preview}...`)
})
```

- [ ] **Step 2: 运行并观察**

```bash
bun demo-04-multi-turn.ts
```

期望输出：
- 第 3 轮回复中出现「新语」和「全栈工程师」，证明模型记住了上下文
- 消息历史打印 6 条（3 user + 3 assistant）

---

## Task 7: demo-05 — 结构化输出 (generateObject)

**Files:**
- Create: `demo-05-structured.ts`

- [ ] **Step 1: 创建 demo-05-structured.ts**

```ts
// 练习目标：用 generateObject + Zod schema 强制模型返回结构化 JSON
import { generateObject } from "ai"
import { z } from "zod"
import { model } from "./lib/ai"

const PersonSchema = z.object({
  name: z.string().describe("姓名"),
  age: z.number().int().min(18).max(60).describe("年龄"),
  role: z.enum(["frontend", "backend", "fullstack", "devops"]).describe("工程师类型"),
  skills: z.array(z.string()).min(2).max(5).describe("技术栈列表"),
  bio: z.string().max(100).describe("一句话简介"),
})

const { object } = await generateObject({
  model,
  schema: PersonSchema,
  prompt: "生成一个虚构的中国工程师人物档案。",
})

console.log("\n=== 结构化输出 ===")
console.log(JSON.stringify(object, null, 2))

// 验证 Zod schema 通过
const parsed = PersonSchema.safeParse(object)
console.log("\n=== Zod 验证 ===")
console.log("通过:", parsed.success)
if (!parsed.success) {
  console.log("错误:", parsed.error.format())
}
```

- [ ] **Step 2: 运行并观察**

```bash
bun demo-05-structured.ts
```

期望输出：
- 打印完整的 JSON 对象，包含 name、age、role、skills、bio 字段
- `Zod 验证 通过: true`

---

## Task 8: demo-06 — 文件系统工具

**Files:**
- Create: `demo-06-filesystem.ts`

- [ ] **Step 1: 创建 demo-06-filesystem.ts**

```ts
// 练习目标：将 Bun 文件 API 包装成 tool，让模型自主操作本地文件
import { generateText, tool } from "ai"
import { z } from "zod"
import { readdir } from "node:fs/promises"
import { model } from "./lib/ai"

const result = await generateText({
  model,
  prompt: "列出当前目录的文件，然后读取 package.json，告诉我项目名称和版本号。",
  tools: {
    listDir: tool({
      description: "列出指定目录下的文件和文件夹",
      parameters: z.object({
        path: z.string().describe("目录路径，例如 . 表示当前目录"),
      }),
      execute: async ({ path }) => {
        const entries = await readdir(path)
        return entries.join("\n")
      },
    }),
    readFile: tool({
      description: "读取文件内容",
      parameters: z.object({
        path: z.string().describe("文件路径"),
      }),
      execute: async ({ path }) => {
        return await Bun.file(path).text()
      },
    }),
    writeFile: tool({
      description: "向文件写入内容（覆盖）",
      parameters: z.object({
        path: z.string().describe("文件路径"),
        content: z.string().describe("写入内容"),
      }),
      execute: async ({ path, content }) => {
        await Bun.write(path, content)
        return `已写入 ${path}`
      },
    }),
  },
  maxSteps: 5,
  onStepFinish: ({ toolCalls, toolResults }) => {
    if (toolCalls.length > 0) {
      console.log("\n[tool]", toolCalls[0].toolName, "→", JSON.stringify(toolResults[0]?.result)?.slice(0, 80))
    }
  },
})

console.log("\n=== 最终回复 ===")
console.log(result.text)
```

- [ ] **Step 2: 运行并观察**

```bash
bun demo-06-filesystem.ts
```

期望输出：
- `[tool] listDir →` 打印目录文件列表
- `[tool] readFile →` 打印 package.json 内容片段
- 最终回复中出现 `"name": "agent-demo"` 和版本号

---

## Task 9: demo-07 — bash 执行工具

**Files:**
- Create: `demo-07-bash.ts`

- [ ] **Step 1: 创建 demo-07-bash.ts**

```ts
// 练习目标：用 Bun.spawnSync 包装 execBash tool，让模型执行 shell 命令
import { generateText, tool } from "ai"
import { z } from "zod"
import { model } from "./lib/ai"

const result = await generateText({
  model,
  prompt: "运行 date 命令告诉我现在的时间，然后用 echo 打印'Hello from Agent'。",
  tools: {
    execBash: tool({
      description: "执行 bash 命令，返回 stdout 和 stderr",
      parameters: z.object({
        command: z.string().describe("要执行的 shell 命令"),
      }),
      execute: async ({ command }) => {
        const proc = Bun.spawnSync(["bash", "-c", command])
        const stdout = proc.stdout.toString().trim()
        const stderr = proc.stderr.toString().trim()
        return { stdout, stderr, exitCode: proc.exitCode }
      },
    }),
  },
  maxSteps: 4,
  onStepFinish: ({ toolCalls, toolResults }) => {
    if (toolCalls.length > 0) {
      const cmd = (toolCalls[0].args as { command: string }).command
      const out = (toolResults[0]?.result as { stdout: string } | undefined)?.stdout ?? ""
      console.log(`\n[bash] $ ${cmd}`)
      console.log(`       → ${out}`)
    }
  },
})

console.log("\n=== 最终回复 ===")
console.log(result.text)
```

- [ ] **Step 2: 运行并观察**

```bash
bun demo-07-bash.ts
```

期望输出：
- `[bash] $ date` → 当前日期时间字符串
- `[bash] $ echo 'Hello from Agent'` → `Hello from Agent`
- 最终回复描述了执行结果

---

## Task 10: demo-08 — 多 provider 切换

**Files:**
- Create: `demo-08-multi-provider.ts`

- [ ] **Step 1: 创建 demo-08-multi-provider.ts**

```ts
// 练习目标：创建两个 provider 实例，同一 prompt 并发发送，对比输出
import { createOpenAI } from "@ai-sdk/openai"
import { generateText } from "ai"

// Provider 1：主 Kimi 实例
const provider1 = createOpenAI({
  apiKey: process.env.KIMI_API_KEY!,
  baseURL: process.env.KIMI_BASE_URL!,
})
const model1 = provider1(process.env.KIMI_MODEL ?? "kimi-k2-0711-preview")

// Provider 2：第二个实例（默认复用 Kimi，用户可在 .env 中配置不同 endpoint）
const provider2 = createOpenAI({
  apiKey: process.env.PROVIDER2_API_KEY || process.env.KIMI_API_KEY!,
  baseURL: process.env.PROVIDER2_BASE_URL || process.env.KIMI_BASE_URL!,
})
const model2 = provider2(process.env.PROVIDER2_MODEL ?? process.env.KIMI_MODEL ?? "kimi-k2-0711-preview")

const prompt = "用一句话解释什么是 AI Agent。"

console.log(`\nPrompt: ${prompt}\n`)
console.log("同时向两个 provider 发送请求...\n")

const [r1, r2] = await Promise.all([
  generateText({ model: model1, prompt }),
  generateText({ model: model2, prompt }),
])

console.log("=== Provider 1 ===")
console.log(`Model: ${process.env.KIMI_MODEL ?? "kimi-k2-0711-preview"}`)
console.log(r1.text)

console.log("\n=== Provider 2 ===")
console.log(`Model: ${process.env.PROVIDER2_MODEL ?? process.env.KIMI_MODEL ?? "kimi-k2-0711-preview"}`)
console.log(r2.text)
```

- [ ] **Step 2: 运行并观察**

```bash
bun demo-08-multi-provider.ts
```

期望输出：
- Provider 1 和 Provider 2 各自打印对 AI Agent 的一句话解释
- 若两个实例配置相同，两条回复内容不同（模型采样随机性）；若配置了不同 endpoint，则来自不同模型

---

## 自检清单

运行完所有 demo 后，确认以下内容：

- [ ] `bun demo-01-streaming.ts` — 流式逐字输出
- [ ] `bun demo-02-tool-use.ts` — toolCalls / toolResults 有内容
- [ ] `bun demo-03-agent-loop.ts` — 打印多个 Step，最终给出答案 464
- [ ] `bun demo-04-multi-turn.ts` — 第 3 轮回复提到「新语」和「全栈工程师」
- [ ] `bun demo-05-structured.ts` — Zod 验证通过: true
- [ ] `bun demo-06-filesystem.ts` — 模型读出 package.json 并说出项目名
- [ ] `bun demo-07-bash.ts` — bash 命令执行成功，stdout 有内容
- [ ] `bun demo-08-multi-provider.ts` — 两个 provider 各自返回结果
