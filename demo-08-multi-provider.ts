// 练习目标：创建两个 provider 实例，同一 prompt 并发发送，对比输出
import { createOpenAI } from "@ai-sdk/openai"
import { generateText } from "ai"

const provider1 = createOpenAI({
  apiKey: process.env.KIMI_API_KEY!,
  baseURL: process.env.KIMI_BASE_URL!,
})
const model1 = provider1(process.env.KIMI_MODEL ?? "deepseek-v3")

const provider2 = createOpenAI({
  apiKey: process.env.PROVIDER2_API_KEY || process.env.KIMI_API_KEY!,
  baseURL: process.env.PROVIDER2_BASE_URL || process.env.KIMI_BASE_URL!,
})
const model2 = provider2(process.env.PROVIDER2_MODEL || process.env.KIMI_MODEL || "deepseek-v3")

const prompt = "解释一下AGENT 和 AGI"

console.log(`\nPrompt: ${prompt}\n`)
console.log("同时向两个 provider 发送请求...\n")

const [r1, r2] = await Promise.all([
  generateText({ model: model1, prompt }),
  generateText({ model: model2, prompt }),
])

console.log("=== Provider 1 ===")
console.log(`Model: ${process.env.KIMI_MODEL ?? "deepseek-v3"}`)
console.log(r1.text)

console.log("\n=== Provider 2 ===")
console.log(`Model: ${process.env.PROVIDER2_MODEL || process.env.KIMI_MODEL || "deepseek-v3"}`)
console.log(r2.text)
