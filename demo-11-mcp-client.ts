// 练习目标：用 MCP Client 连接本地 MCP Server，工具自动透传给模型
import { experimental_createMCPClient, generateText } from "ai"
import { Experimental_StdioMCPTransport } from "ai/mcp-stdio"
import { join } from "node:path"
import { model } from "./lib/ai"

const client = await experimental_createMCPClient({
  transport: new Experimental_StdioMCPTransport({
    command: "bun",
    args: [join(import.meta.dir, "demo-10-mcp-server.ts")],
  }),
})

console.log("MCP Client 已连接，正在获取工具列表...")
const mcpTools = await client.tools()
console.log("已加载工具:", Object.keys(mcpTools).join(", "))

try {
  const result = await generateText({
    model,
    tools: mcpTools,
    prompt: "告诉我现在几点、帮我计算 123 * 456、再讲一个 http 话题的笑话",
    maxSteps: 5,
  })

  console.log("\n=== 工具调用记录 ===")
  result.steps.forEach((step, i) => {
    step.toolCalls.forEach(c => {
      console.log(`Step ${i + 1}: ${c.toolName}`, JSON.stringify(c.args))
    })
  })

  console.log("\n=== 最终回复 ===")
  console.log(result.text)
} finally {
  await client.close()
}
