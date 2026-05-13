// 练习目标：onStepFinish 心跳监控——每步实时上报执行进度与 token 用量
import { generateText, tool } from "ai"
import { z } from "zod"
import { model } from "./lib/ai"

interface Heartbeat {
  step: number
  elapsed: string
  tokensUsed: number
  status: string
  lastTool?: string
}

const fakeData: Record<string, string> = {
  量子计算: "量子计算利用量子叠加和纠缠特性，理论上可并行处理经典计算机无法解决的复杂问题。目前 IBM、Google 等已实现百量子比特级别的量子处理器。",
  现状: "2024年量子计算进入NISQ（含噪声中等规模量子）时代，量子优越性在特定任务上已被证明，但通用容错量子计算机仍需数年研发。",
}

const startTime = Date.now()
let stepIndex = 0
let totalTokens = 0

function printHeartbeat(beat: Heartbeat): void {
  const toolSuffix = beat.lastTool ? ` | 工具: ${beat.lastTool}` : ""
  const line = `[心跳] Step ${beat.step} | 耗时 ${beat.elapsed} | Tokens ${beat.tokensUsed} | ${beat.status}${toolSuffix}`
  process.stdout.write(`\r${line.padEnd(80)}`)
}

const result = await generateText({
  model,
  prompt: "请研究「量子计算的现状」：先用 search 搜索「量子计算」，再用 analyze 分析搜索结果，最后给出总结。",
  tools: {
    search: tool({
      description: "搜索指定关键词，返回相关信息",
      parameters: z.object({
        query: z.string().describe("搜索关键词"),
      }),
      execute: async ({ query }) => {
        await new Promise(r => setTimeout(r, 500))
        return fakeData[query] ?? `关于「${query}」暂无数据，请尝试其他关键词。`
      },
    }),
    analyze: tool({
      description: "分析给定文本，提取关键信息点",
      parameters: z.object({
        content: z.string().describe("需要分析的文本内容"),
      }),
      execute: async ({ content }) => {
        await new Promise(r => setTimeout(r, 300))
        const points = content.split("，").slice(0, 3).map((p, i) => `${i + 1}. ${p.trim()}`)
        return `关键要点：\n${points.join("\n")}`
      },
    }),
  },
  maxSteps: 6,
  onStepFinish: ({ toolCalls, usage, finishReason }) => {
    totalTokens += usage?.totalTokens ?? 0
    const beat: Heartbeat = {
      step: ++stepIndex,
      elapsed: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
      tokensUsed: totalTokens,
      status: finishReason === "tool-calls" ? "工具调用中" : finishReason === "stop" ? "推理完成" : "生成中",
      lastTool: toolCalls[toolCalls.length - 1]?.toolName,
    }
    printHeartbeat(beat)
  },
})

process.stdout.write("\n")
console.log("\n=== Agent 执行摘要 ===")
console.log(`总步骤: ${result.steps.length}`)
console.log(`总耗时: ${((Date.now() - startTime) / 1000).toFixed(1)}s`)
console.log(`总 Tokens: ${result.usage?.totalTokens ?? totalTokens}`)

console.log("\n=== 最终结果 ===")
console.log(result.text)
