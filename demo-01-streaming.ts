// 练习目标：用 streamText 消费 textStream，实现打字机效果
import { streamText } from "ai"
import { model } from "./lib/ai"

const { textStream } = streamText({
  model,
  prompt: "用中文详细介绍一下流式输出（Streaming）的原理，以及它在大语言模型中的应用场景，至少写 300 字。",
})

process.stdout.write("\n")
for await (const chunk of textStream) {
  process.stdout.write(chunk)
}
process.stdout.write("\n")
