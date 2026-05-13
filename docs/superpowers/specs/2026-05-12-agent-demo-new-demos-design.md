# Agent Demo 新增 Demo 设计规格

日期：2026-05-12  
项目：`agent-demo`（Vercel AI SDK 渐进式练习集）  
新增：Demo 09 ~ 13，共 5 个独立 demo 文件

---

## 背景

现有项目包含 demo-01 ~ demo-08，覆盖流式输出、工具调用、Agent Loop、多轮对话、结构化输出、文件系统、Bash 执行、多 Provider 并发。本次新增 5 个 demo，涵盖动态技能开关、MCP 完整链路、跨会话记忆、Agent 心跳监控四个主题。

---

## 整体方案

**方案 A（已确认）：5 个独立自包含 demo 文件，风格与现有一致。**

新增依赖：`@modelcontextprotocol/sdk`（MCP Server 用）

---

## Demo 09 — 动态技能开关（`experimental_activeTools`）

**文件：** `demo-09-dynamic-skills.ts`

**目标：** 演示 `experimental_activeTools`，让模型每步只能调用当前激活的工具子集。

### 工具集

| 工具名 | 作用 | 激活条件 |
|--------|------|----------|
| `classify` | 判断问题类型 → `"math" \| "time" \| "joke"` | 初始激活 |
| `calculate` | 执行数学表达式 | 分类结果为 `math` 后激活 |
| `get_time` | 返回当前时间 | 分类结果为 `time` 后激活 |
| `get_joke` | 返回一条笑话 | 分类结果为 `joke` 后激活 |

### 执行流程

1. 初始 `experimental_activeTools: ["classify"]`
2. `onStepFinish` 读取 `toolResults[0].result`，切换 `activeTools`
3. 下一步模型调用对应子集工具并返回最终答案
4. 共最多 3 步（classify → tool call → 文字回复）

### 关键代码骨架

```ts
let activeTools: string[] = ["classify"]

const result = await generateText({
  model,
  prompt: "...",
  tools: { classify, calculate, get_time, get_joke },
  experimental_activeTools: activeTools,
  maxSteps: 3,
  onStepFinish: ({ toolResults }) => {
    const category = toolResults[0]?.result
    if (category === "math") activeTools = ["calculate"]
    if (category === "time") activeTools = ["get_time"]
    if (category === "joke") activeTools = ["get_joke"]
  },
})
```

---

## Demo 10 — MCP Server

**文件：** `demo-10-mcp-server.ts`

**目标：** 用 `@modelcontextprotocol/sdk` 创建一个本地 MCP Server，通过 stdio 传输暴露 3 个工具。

### 暴露工具

| 工具名 | 参数 | 返回 |
|--------|------|------|
| `get_time` | `timezone?: string` | 当前时间字符串 |
| `calculate` | `expression: string` | 计算结果字符串 |
| `get_joke` | `topic?: string` | 一条笑话文本 |

### 传输方式

`StdioServerTransport`（stdin/stdout），启动命令：`bun demo-10-mcp-server.ts`

### 关键代码骨架

```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z } from "zod"

const server = new McpServer({ name: "demo-server", version: "1.0.0" })

server.tool("get_time", { timezone: z.string().optional() }, async ({ timezone }) => ({
  content: [{ type: "text", text: new Date().toLocaleString("zh-CN", { timeZone: timezone ?? "Asia/Shanghai" }) }]
}))

server.tool("calculate", { expression: z.string() }, async ({ expression }) => ({
  content: [{ type: "text", text: String(Function(`"use strict"; return (${expression})`)()) }]
}))

server.tool("get_joke", { topic: z.string().optional() }, async ({ topic }) => ({
  content: [{ type: "text", text: jokes[topic ?? "general"] ?? jokes.general }]
}))

await server.connect(new StdioServerTransport())
```

---

## Demo 11 — MCP Client

**文件：** `demo-11-mcp-client.ts`

**目标：** 用 Vercel AI SDK 的 `experimental_createMCPClient` 通过 stdio 连接 demo-10 MCP Server，工具自动透传给模型。

### 连接方式

`Experimental_StdioMCPTransport`，自动 fork `bun demo-10-mcp-server.ts` 子进程。

### 演示 Prompt

同时询问时间、计算、笑话，让模型自主决定调用哪些 MCP 工具（可能触发多次工具调用）。

### 关键代码骨架

```ts
import { experimental_createMCPClient, generateText } from "ai"
import { Experimental_StdioMCPTransport } from "ai/mcp-stdio"
import { model } from "./lib/ai"

const client = await experimental_createMCPClient({
  transport: new Experimental_StdioMCPTransport({
    command: "bun",
    args: ["demo-10-mcp-server.ts"],
  }),
})

const mcpTools = await client.tools()

const result = await generateText({
  model,
  tools: mcpTools,
  prompt: "告诉我现在几点、计算 123 * 456、再讲个笑话",
  maxSteps: 5,
})

console.log(result.text)
await client.close()
```

---

## Demo 12 — 跨会话记忆

**文件：** `demo-12-memory.ts`

**目标：** 参考 OpenCode 的 session 持久化思路，用 JSON 文件保存对话历史，启动时可选择恢复上次会话。

### 存储结构

```
./sessions/
  <timestamp>-<shortId>.json    ← 每个会话一个文件
```

### Session 文件格式

```ts
interface Session {
  id: string           // "<timestamp>-<shortId>"
  createdAt: string    // ISO 8601
  messages: CoreMessage[]
}
```

### 启动行为

1. 扫描 `./sessions/` 目录，找最近修改的文件
2. 若存在：显示提示 `上次对话（N 条消息，X 分钟前）—— 继续？[y/N]`
3. 选 `y`：加载历史 `messages` 继续对话
4. 选 `n` 或无历史：新建 session，生成新 ID
5. 每轮 user + assistant 消息追加后立即 `Bun.write()` 持久化

### 交互模式

readline REPL，输入 `exit` 退出并打印 session 文件路径。

### 关键代码骨架

```ts
import { generateText, type CoreMessage } from "ai"
import { createInterface } from "readline"
import { model } from "./lib/ai"

const sessionsDir = "./sessions"
// 加载或新建 session ...
const messages: CoreMessage[] = session.messages

const rl = createInterface({ input: process.stdin, output: process.stdout })
// REPL 循环: 读取 input → push user message → generateText → push assistant message → 写文件
```

---

## Demo 13 — Agent 心跳监控

**文件：** `demo-13-heartbeat.ts`

**目标：** 多步 Agent 任务执行过程中，`onStepFinish` 每步发出心跳，终端原地刷新显示实时进度。

### 心跳数据结构

```ts
interface Heartbeat {
  step: number        // 当前第几步（从 1 开始）
  elapsed: string     // 已耗时，如 "2.3s"
  tokensUsed: number  // 累计 token 总量
  status: string      // 步骤状态描述
  lastTool?: string   // 最后调用的工具名（可选）
}
```

### 演示场景

模拟一个「三步研究任务」：
1. `search(query)` → 返回伪造的搜索结果
2. `analyze(content)` → 提取关键点
3. 最终生成总结文本

### 显示效果

```
[心跳] Step 2 | 耗时 3.1s | Tokens 412 | 工具返回，继续推理 | 工具: search
```

使用 `process.stdout.write("\r...")` 原地覆盖同一行，任务完成后换行输出最终结果。

### 关键代码骨架

```ts
const startTime = Date.now()
let stepIndex = 0
let totalTokens = 0

const result = await generateText({
  model,
  prompt: "请研究「量子计算的现状」：先搜索，再分析，最后总结。",
  tools: { search, analyze },
  maxSteps: 5,
  onStepFinish: ({ toolCalls, usage }) => {
    totalTokens += usage?.totalTokens ?? 0
    const beat: Heartbeat = {
      step: ++stepIndex,
      elapsed: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
      tokensUsed: totalTokens,
      status: toolCalls.length > 0 ? "工具调用中" : "推理生成中",
      lastTool: toolCalls[0]?.toolName,
    }
    const line = `[心跳] Step ${beat.step} | 耗时 ${beat.elapsed} | Tokens ${beat.tokensUsed} | ${beat.status}${beat.lastTool ? ` | 工具: ${beat.lastTool}` : ""}`
    process.stdout.write(`\r${line}`)
  },
})

process.stdout.write("\n")
console.log("\n=== 最终结果 ===")
console.log(result.text)
```

---

## 新增依赖

| 包 | 用途 |
|----|------|
| `@modelcontextprotocol/sdk` | Demo 10 MCP Server |

Demo 11 所需的 `ai/mcp-stdio` 已包含在现有 `ai` 包中（v4.3+）。

---

## 文件清单

```
agent-demo/
├── demo-09-dynamic-skills.ts   ← 新增
├── demo-10-mcp-server.ts       ← 新增
├── demo-11-mcp-client.ts       ← 新增
├── demo-12-memory.ts           ← 新增
├── demo-13-heartbeat.ts        ← 新增
├── sessions/                   ← 新增（demo-12 运行时自动创建）
└── ...（现有文件不变）
```

---

## 运行说明

```bash
bun demo-09-dynamic-skills.ts
bun demo-10-mcp-server.ts       # 单独运行可测试 MCP Server
bun demo-11-mcp-client.ts       # 自动启动 demo-10 子进程
bun demo-12-memory.ts           # REPL，输入 exit 退出
bun demo-13-heartbeat.ts
```
