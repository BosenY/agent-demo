// 练习目标：将 Bun 文件 API 包装成 tool，让模型自主操作本地文件
import { generateText, tool } from "ai"
import { z } from "zod"
import { readdir } from "node:fs/promises"
import { model } from "./lib/ai"

const result = await generateText({
  model,
  prompt: "列出当前目录的文件，然后读取 package.json，告诉我项目名称和版本号。",
  tools: {
    listDir: tool({
      description: "列出指定目录下的文件和文件夹",
      parameters: z.object({
        path: z.string().describe("目录路径，例如 . 表示当前目录"),
      }),
      execute: async ({ path }) => {
        const entries = await readdir(path)
        return entries.join("\n")
      },
    }),
    readFile: tool({
      description: "读取文件内容",
      parameters: z.object({
        path: z.string().describe("文件路径"),
      }),
      execute: async ({ path }) => {
        return await Bun.file(path).text()
      },
    }),
    writeFile: tool({
      description: "向文件写入内容（覆盖）",
      parameters: z.object({
        path: z.string().describe("文件路径"),
        content: z.string().describe("写入内容"),
      }),
      execute: async ({ path, content }) => {
        await Bun.write(path, content)
        return `已写入 ${path}`
      },
    }),
  },
  maxSteps: 5,
  onStepFinish: ({ toolCalls, toolResults }) => {
    if (toolCalls.length > 0) {
      console.log("\n[tool]", toolCalls[0].toolName, "→", JSON.stringify(toolResults[0]?.result)?.slice(0, 80))
    }
  },
})

console.log("\n=== 最终回复 ===")
console.log(result.text)
