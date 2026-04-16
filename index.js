const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys")
const OpenAI = require("openai")

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const CONFIG = {
  bot1: { target: "6285837817985@s.whatsapp.net" },
  bot2: { target: "6285869332353@s.whatsapp.net" }
}

const sessions = {}
const convoState = new Map()
const historyMap = new Map()

const MAX_TURN = 6
const delay = (ms) => new Promise(r => setTimeout(r, ms))

async function askAI(prompt, history) {
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "system", content: prompt }, ...history]
  })
  return res.choices[0].message.content
}

async function startBot(name) {
  const { state, saveCreds } = await useMultiFileAuthState(`sessions/${name}`)

  const sock = makeWASocket({
    auth: state,
    browser: ["ArmbianBot", "Chrome", "1.0"]
  })

  sessions[name] = sock

  sock.ev.on("creds.update", saveCreds)

  sock.ev.on("connection.update", ({ connection }) => {
    if (connection === "close") {
      console.log(`[${name}] reconnecting...`)
      startBot(name)
    } else if (connection === "open") {
      console.log(`[${name}] connected`)
    }
  })

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message || msg.key.fromMe) return

    const from = msg.key.remoteJid
    const text = (msg.message.conversation || "").toLowerCase()

    const target = CONFIG[name].target
    if (from !== target) return

    const key = `${name}|${from}`

    if (!convoState.has(key)) {
      convoState.set(key, { turn: 0, active: false })
    }

    const state = convoState.get(key)

    if (text === "stop") {
      state.active = false
      state.turn = 0
      return
    }

    if (text === "start" && !state.active) {
      state.active = true
      state.turn = 0
      await delay(1500)
      return sock.sendMessage(target, { text: "Halo, mulai ngobrol ya 😄" })
    }

    if (!state.active) return

    if (state.turn >= MAX_TURN) {
      state.active = false
      return sock.sendMessage(target, { text: "Udahan dulu ya 👍" })
    }

    let history = historyMap.get(from) || []
    history.push({ role: "user", content: text })
    history = history.slice(-6)

    try {
      const prompt = name === "bot1"
        ? "Ngobrol santai, sedikit humor."
        : "Ramah, suka tanya balik."

      const reply = await askAI(prompt, history)

      history.push({ role: "assistant", content: reply })
      historyMap.set(from, history)

      await delay(2000)
      await sock.sendMessage(target, { text: reply })

      state.turn++
    } catch (err) {
      console.log("AI ERROR:", err.message)
    }
  })
}

async function startAll() {
  for (const name of Object.keys(CONFIG)) {
    await startBot(name)
  }
}
const QRCode = require("qrcode-terminal")
startAll()
