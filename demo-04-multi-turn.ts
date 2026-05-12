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

const r1 = await chat("你好，我叫新语，我是一名全栈工程师。")
console.log("\n[第 1 轮] 模型：", r1)

const r2 = await chat("我最近在学 Vercel AI SDK，你能推荐几个练习方向吗？")
console.log("\n[第 2 轮] 模型：", r2)

const r3 = await chat("你还记得我叫什么名字吗？我的职业是什么？")
console.log("\n[第 3 轮] 模型：", r3)

console.log("\n=== 消息历史（共", messages.length, "条）===")
messages.forEach((m, i) => {
  const preview = typeof m.content === "string" ? m.content.slice(0, 60) : "[复杂内容]"
  console.log(`[${i + 1}] ${m.role}: ${preview}...`)
})
