const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys")

const readline = require("readline")

async function startBot() {

    const { state, saveCreds } = await useMultiFileAuthState("session")

    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        version,
        auth: state,
        browser: ["Ubuntu", "Chrome", "20.0"]
    })

    sock.ev.on("creds.update", saveCreds)

    let pairingRequested = false

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update

        if (connection === "connecting") {
            console.log("🔄 Menghubungkan...")
        }

        if (connection === "open") {
            console.log("✅ Berhasil connect ke WhatsApp!")
        }

        // 🔑 REQUEST PAIRING DI SINI (PALING AMAN)
        if (!state.creds.registered && !pairingRequested) {

            pairingRequested = true

            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            })

            let nomor = await new Promise(resolve => {
                rl.question("Masukkan nomor (08 / 628): ", resolve)
            })

            rl.close()

            nomor = nomor.replace(/[^0-9]/g, "")

            if (nomor.startsWith("08")) {
                nomor = "62" + nomor.slice(1)
            }

            console.log("📱 Nomor:", nomor)

            try {
                const code = await sock.requestPairingCode(nomor)
                console.log("\n🔑 Pairing Code:", code)
                console.log("👉 Masukkan kode di HP sekarang!\n")
            } catch (err) {
                console.log("❌ Pairing gagal:", err.message)
            }
        }

        if (connection === "close") {
            const reason = lastDisconnect?.error?.output?.statusCode

            console.log("❌ Koneksi putus:", reason)

            // ⛔ JANGAN RESTART SAAT PAIRING
            if (reason === 428) {
                console.log("⏳ Menunggu pairing... jangan matikan bot")
                return
            }

            console.log("🔁 Restarting...")
            startBot()
        }
    })
}

startBot()
