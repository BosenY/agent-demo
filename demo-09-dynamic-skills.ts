// 练习目标：用 experimental_activeTools 动态切换每步可用的工具子集
import { generateText, tool } from "ai"
import { z } from "zod"
import { model } from "./lib/ai"

// 注意：此数组仅供单次 generateText 调用使用
const activeTools: Array<"classify" | "calculate" | "get_time" | "get_joke"> = ["classify"]

const jokes = ["为什么程序员喜欢暗色主题？因为 light 会吸引 bug。", "HTTP 418：我是一个茶壶。"]

const result = await generateText({
  model,
  prompt: "帮我算一下 99 * 88 等于多少？",
  tools: {
    classify: tool({
      description: "判断用户问题的类型，返回 math、time 或 joke 之一",
      parameters: z.object({
        category: z.enum(["math", "time", "joke"]).describe("问题类型"),
      }),
      execute: async ({ category }) => category,
    }),
    calculate: tool({
      description: "执行数学表达式，返回计算结果",
      parameters: z.object({
        expression: z.string().describe("合法的 JS 数学表达式，例如 99 * 88"),
      }),
      execute: async ({ expression }) => {
        if (!/^[\d\s+\-*/().]+$/.test(expression)) return "表达式包含非法字符"
        return String(Function(`"use strict"; return (${expression})`)())
      },
    }),
    get_time: tool({
      description: "返回当前北京时间",
      parameters: z.object({}),
      execute: async () =>
        new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }),
    }),
    get_joke: tool({
      description: "返回一条程序员笑话",
      parameters: z.object({}),
      execute: async () => jokes[Math.floor(Math.random() * jokes.length)],
    }),
  },
  experimental_activeTools: activeTools,
  maxSteps: 3,
  onStepFinish: ({ toolResults }) => {
    const category = toolResults[0]?.result as "math" | "time" | "joke" | undefined
    activeTools.length = 0
    if (category === "math") activeTools.push("calculate")
    else if (category === "time") activeTools.push("get_time")
    else if (category === "joke") activeTools.push("get_joke")
    if (category) {
      console.log(`\n[路由] 分类结果: ${category} → 激活工具: ${activeTools.join(", ")}`)
    }
  },
})

console.log("\n=== 最终回复 ===")
console.log(result.text)
console.log(`\n共执行了 ${result.steps.length} 步`)
