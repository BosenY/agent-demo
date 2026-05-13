# Agent Demo

基于 [Vercel AI SDK](https://sdk.vercel.ai/) 的 8 个渐进式练习，覆盖从流式输出到多 Provider 并发的核心用法。运行时：**Bun**，默认模型：**deepseek-v3**（通过 OpenAI 兼容接口）。

## 环境准备

```bash
# 安装依赖
pnpm install

# 配置环境变量（复制后填入你的 Key）
cp .env.example .env
```

`.env` 示例：

```env
KIMI_API_KEY=your_api_key
KIMI_BASE_URL=https://api.moonshot.cn/v1
KIMI_MODEL=deepseek-v3
```

## Demo 列表

| 文件 | 练习目标 |
|------|---------|
| `demo-01-streaming.ts` | `streamText` + `textStream`，打字机效果 |
| `demo-02-tool-use.ts` | 定义 Zod tool schema，读取 `toolCalls` / `toolResults` |
| `demo-03-agent-loop.ts` | `maxSteps` 多步推理，`onStepFinish` 观察每步状态 |
| `demo-04-multi-turn.ts` | 手动维护 `CoreMessage[]`，实现跨轮次上下文记忆 |
| `demo-05-structured.ts` | `generateObject` + Zod schema，强制结构化 JSON 输出 |
| `demo-06-filesystem.ts` | 将 Bun 文件 API 包装成 tool，模型自主操作本地文件 |
| `demo-07-bash.ts` | `Bun.spawnSync` 包装 `execBash` tool，模型执行 shell 命令 |
| `demo-08-multi-provider.ts` | 创建两个 Provider 实例，同一 prompt 并发对比输出 |
| `demo-09-dynamic-skills.ts` | `experimental_activeTools` 动态技能路由，分类后激活对应工具子集 |
| `demo-10-mcp-server.ts` | `@modelcontextprotocol/sdk` 搭建本地 MCP Server，stdio 传输 |
| `demo-11-mcp-client.ts` | `experimental_createMCPClient` 连接 MCP Server，工具自动透传 |
| `demo-12-memory.ts` | 跨会话 JSON 持久化记忆，readline REPL，启动时可恢复历史 |
| `demo-13-heartbeat.ts` | `onStepFinish` 心跳监控，终端原地刷新步骤进度与 token 用量 |

## 运行

```bash
# 运行单个 demo
bun demo-01-streaming.ts
bun demo-02-tool-use.ts
# ...以此类推
bun demo-09-dynamic-skills.ts
bun demo-10-mcp-server.ts       # 单独运行可测试 MCP Server（Ctrl+C 退出）
bun demo-11-mcp-client.ts       # 自动启动 demo-10 子进程，无需手动启动
bun demo-12-memory.ts           # 交互式 REPL，输入 exit 退出
bun demo-13-heartbeat.ts
```

## 项目结构

```
agent-demo/
├── lib/
│   └── ai.ts          # 初始化 Kimi provider，供所有 demo 复用
├── demo-01-*.ts       # 各练习文件
└── package.json
```
