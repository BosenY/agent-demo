// 练习目标：跨会话持久化记忆——对话历史写入 JSON 文件，下次启动可恢复
import { generateText, type CoreMessage } from "ai"
import { createInterface } from "node:readline"
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs"
import { join, basename } from "node:path"
import { model } from "./lib/ai"

interface Session {
  id: string
  createdAt: string
  messages: CoreMessage[]
}

const sessionsDir = "./sessions"
if (!existsSync(sessionsDir)) mkdirSync(sessionsDir)

function shortId(): string {
  return Math.random().toString(36).slice(2, 8)
}

async function findLatestSession(): Promise<{ path: string; session: Session; mtime: Date } | null> {
  const files = readdirSync(sessionsDir)
    .filter(f => f.endsWith(".json"))
    .map(f => ({ name: f, path: join(sessionsDir, f), mtime: statSync(join(sessionsDir, f)).mtime }))
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())

  if (files.length === 0) return null
  const latest = files[0]
  try {
    const session: Session = JSON.parse(await Bun.file(latest.path).text())
    return { path: latest.path, session, mtime: latest.mtime }
  } catch {
    return null
  }
}

function minutesAgo(isoDate: string): string {
  const mins = Math.floor((Date.now() - new Date(isoDate).getTime()) / 60000)
  if (mins < 1) return "刚刚"
  if (mins < 60) return `${mins} 分钟前`
  return `${Math.floor(mins / 60)} 小时前`
}

async function ask(rl: ReturnType<typeof createInterface>, q: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const onClose = () => reject(new Error("EOF"))
    rl.once("close", onClose)
    rl.question(q, (answer) => {
      rl.removeListener("close", onClose)
      resolve(answer)
    })
  })
}

const rl = createInterface({ input: process.stdin, output: process.stdout })

let sessionPath: string
let messages: CoreMessage[]
let sessionCreatedAt: string

const latest = await findLatestSession()
if (latest) {
  const { session } = latest
  const msgCount = session.messages.length
  const ago = minutesAgo(latest.mtime.toISOString())
  const answer = await ask(rl, `上次对话（${msgCount} 条消息，${ago}）—— 继续？[y/N] `)
  if (answer.trim().toLowerCase() === "y") {
    messages = session.messages
    sessionPath = latest.path
    sessionCreatedAt = session.createdAt
    console.log(`已加载会话 ${session.id}，历史 ${msgCount} 条消息\n`)
  } else {
    const id = `${Date.now()}-${shortId()}`
    sessionPath = join(sessionsDir, `${id}.json`)
    messages = []
    sessionCreatedAt = new Date().toISOString()
    console.log(`新建会话 ${id}\n`)
  }
} else {
  const id = `${Date.now()}-${shortId()}`
  sessionPath = join(sessionsDir, `${id}.json`)
  messages = []
  sessionCreatedAt = new Date().toISOString()
  console.log("首次运行，新建会话\n")
}

async function saveSession(): Promise<void> {
  const id = basename(sessionPath, ".json")
  const session: Session = {
    id,
    createdAt: sessionCreatedAt,
    messages,
  }
  await Bun.write(sessionPath, JSON.stringify(session, null, 2))
}

console.log('输入消息开始对话，输入 "exit" 退出\n')

try {
  while (true) {
    let input: string
    try {
      input = await ask(rl, "你: ")
    } catch {
      break
    }
    if (input.trim().toLowerCase() === "exit") break

    messages.push({ role: "user", content: input })

    try {
      const result = await generateText({ model, messages })
      messages.push({ role: "assistant", content: result.text })
      console.log(`\n助手: ${result.text}\n`)
      await saveSession()
    } catch (e) {
      messages.pop()
      console.error(`\n请求失败：${(e as Error).message}\n`)
    }
  }
} finally {
  rl.close()
}
console.log(`\n会话已保存到 ${sessionPath}`)
console.log(`共 ${messages.length} 条消息`)
