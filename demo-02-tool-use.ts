// 练习目标：定义 Zod tool schema，让模型主动调用工具，读取 toolCalls / toolResults
import { generateText, tool } from "ai"
import { z } from "zod"
import { model } from "./lib/ai"

const result = await generateText({
  model,
  prompt: "查询北京和上海今天的天气。",
  maxSteps: 3,
  tools: {
    getWeather: tool({
      description: "查询某个城市今天的天气",
      parameters: z.object({
        city: z.string().describe("城市名称，例如：北京"),
      }),
      execute: async ({ city }) => {
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
console.log(JSON.stringify(result.steps.flatMap(s => s.toolCalls), null, 2))

console.log("\n=== toolResults ===")
console.log(JSON.stringify(result.steps.flatMap(s => s.toolResults), null, 2))

console.log("\n=== 最终回复 ===")
console.log(result.text)
