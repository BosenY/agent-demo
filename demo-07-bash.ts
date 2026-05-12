// 练习目标：用 Bun.spawnSync 包装 execBash tool，让模型执行 shell 命令
import { generateText, tool } from "ai"
import { z } from "zod"
import { model } from "./lib/ai"

const result = await generateText({
  model,
  prompt: "运行 date 命令告诉我现在的时间，然后用 echo 打印'Hello from Agent'。",
  tools: {
    execBash: tool({
      description: "执行 bash 命令，返回 stdout 和 stderr",
      parameters: z.object({
        command: z.string().describe("要执行的 shell 命令"),
      }),
      execute: async ({ command }) => {
        const proc = Bun.spawnSync(["bash", "-c", command])
        const stdout = proc.stdout.toString().trim()
        const stderr = proc.stderr.toString().trim()
        return { stdout, stderr, exitCode: proc.exitCode }
      },
    }),
  },
  maxSteps: 4,
  onStepFinish: ({ toolCalls, toolResults }) => {
    if (toolCalls.length > 0) {
      const cmd = (toolCalls[0].args as { command: string }).command
      const out = (toolResults[0]?.result as { stdout: string } | undefined)?.stdout ?? ""
      console.log(`\n[bash] $ ${cmd}`)
      console.log(`       → ${out}`)
    }
  },
})

console.log("\n=== 最终回复 ===")
console.log(result.text)
