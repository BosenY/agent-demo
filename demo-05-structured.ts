// 练习目标：用 generateObject + Zod schema 强制模型返回结构化 JSON
import { generateObject } from "ai"
import { z } from "zod"
import { model } from "./lib/ai"

const PersonSchema = z.object({
  name: z.string().describe("姓名"),
  age: z.number().int().min(18).max(60).describe("年龄"),
  role: z.enum(["frontend", "backend", "fullstack", "devops"]).describe("工程师类型"),
  skills: z.array(z.string()).min(2).max(5).describe("技术栈列表"),
  bio: z.string().max(100).describe("一句话简介"),
})

const { object } = await generateObject({
  model,
  schema: PersonSchema,
  prompt: "生成一个虚构的中国工程师人物档案。",
})

console.log("\n=== 结构化输出 ===")
console.log(JSON.stringify(object, null, 2))

const parsed = PersonSchema.safeParse(object)
console.log("\n=== Zod 验证 ===")
console.log("通过:", parsed.success)
if (!parsed.success) {
  console.log("错误:", parsed.error.format())
}
