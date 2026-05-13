// 练习目标：使用 @modelcontextprotocol/sdk 创建 MCP Server，通过 stdio 暴露工具，理解工具定义与传输层的分离
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z } from "zod"

const jokes: Record<string, string> = {
  general: "为什么程序员喜欢暗色主题？因为 light 会吸引 bug。",
  http: "HTTP 418：我是一个茶壶。",
  git: "Git blame 的最大作用是让你记住：六个月前的你也是别人。",
}

const server = new McpServer({ name: "agent-demo-server", version: "1.0.0" })

server.tool(
  "get_time",
  "返回指定时区的当前时间",
  { timezone: z.string().optional().describe("时区名称，例如 Asia/Shanghai") },
  async ({ timezone }) => {
    try {
      return {
        content: [{
          type: "text" as const,
          text: new Date().toLocaleString("zh-CN", {
            timeZone: timezone ?? "Asia/Shanghai",
          }),
        }],
      }
    } catch {
      return { content: [{ type: "text" as const, text: `错误: 无效的时区 "${timezone}"` }] }
    }
  },
)

server.tool(
  "calculate",
  "执行数学表达式并返回结果",
  { expression: z.string().describe("纯数学表达式，例如 (2 + 3) * 4") },
  async ({ expression }) => {
    if (!/^[\d\s+\-*/%.()]+$/.test(expression)) {
      return { content: [{ type: "text" as const, text: "错误: 仅允许纯数学表达式（数字和 +、-、*、/、%、()）" }] }
    }
    try {
      const result = Function(`"use strict"; return (${expression})`)()
      return { content: [{ type: "text" as const, text: String(result) }] }
    } catch (e) {
      return { content: [{ type: "text" as const, text: `错误: ${e}` }] }
    }
  },
)

server.tool(
  "get_joke",
  "返回一条程序员笑话",
  { topic: z.string().optional().describe("话题：general、http、git") },
  async ({ topic }) => ({
    content: [
      {
        type: "text" as const,
        text: jokes[topic ?? "general"] ?? jokes.general,
      },
    ],
  }),
)

await server.connect(new StdioServerTransport())
