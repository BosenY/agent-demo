// 初始化 Kimi provider，供所有 demo import
import { createOpenAI } from "@ai-sdk/openai"

export const kimi = createOpenAI({
  apiKey: process.env.KIMI_API_KEY!,
  baseURL: process.env.KIMI_BASE_URL!,
})

export const model = kimi(process.env.KIMI_MODEL ?? "deepseek-v3")
