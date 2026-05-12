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
