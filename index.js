const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys")
const readline = require("readline")

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("session")

    const sock = makeWASocket({
        auth: state,
        browser: ["ArmbianBot", "Chrome", "1.0"]
    })

    sock.ev.on("creds.update", saveCreds)

    // 🔑 PAIRING CODE LOGIN
    if (!state.creds.registered) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        })

        const nomor = await new Promise(resolve => {
            rl.question("Masukkan nomor (628xxx): ", resolve)
        })

        try {
            const code = await sock.requestPairingCode(nomor)
            console.log("\n🔑 Pairing Code:", code, "\n")
        } catch (err) {
            console.log("❌ Error pairing:", err.message)
        }

        rl.close()
    }

    sock.ev.on("connection.update", ({ connection }) => {
        if (connection === "open") {
            console.log("✅ Berhasil login!")
        }

        if (connection === "close") {
            console.log("❌ Koneksi putus, reconnect...")
            startBot()
        }
    })
}

startBot()
