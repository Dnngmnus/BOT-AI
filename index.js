const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys")

const readline = require("readline")

// input nomor
async function inputNomor() {
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

    if (!/^628[0-9]{8,13}$/.test(nomor)) {
        console.log("❌ Nomor tidak valid!")
        process.exit(1)
    }

    console.log("✅ Nomor:", nomor)
    return nomor
}

async function startBot() {
    const nomor = await inputNomor()

    const { state, saveCreds } = await useMultiFileAuthState("session")

    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        version,
        auth: state,
        browser: ["Windows", "Chrome", "120.0.0"]
    })

    sock.ev.on("creds.update", saveCreds)

    let pairingDone = false

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update

        if (connection === "connecting") {
            console.log("🔄 Menghubungkan...")
        }

        if (connection === "open") {
            console.log("✅ Login berhasil!")
        }

        // 🔑 pairing
        if (!state.creds.registered && !pairingDone) {
            pairingDone = true

            try {
                const code = await sock.requestPairingCode(nomor)
                console.log("\n🔑 Pairing Code:", code)
                console.log("📱 Masukkan di WhatsApp sekarang!\n")
            } catch (err) {
                console.log("❌ Pairing gagal:", err.message)
            }
        }

        if (connection === "close") {
            const reason = lastDisconnect?.error?.output?.statusCode

            console.log("❌ Koneksi putus:", reason)

            // jangan restart saat pairing
            if (reason === 428) {
                console.log("⏳ Menunggu pairing... jangan tutup bot")
                return
            }

            console.log("🔁 Restarting 5 detik...")
            setTimeout(startBot, 5000)
        }
    })
}

startBot()
