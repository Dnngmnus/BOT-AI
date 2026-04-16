const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys")
const readline = require("readline")

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

    if (!/^628[0-9]{7,12}$/.test(nomor)) {
        console.log("❌ Nomor tidak valid!")
        process.exit(1)
    }

    console.log("✅ Nomor:", nomor)
    return nomor
}

async function startBot() {

    const nomor = await inputNomor()

    const { state, saveCreds } = await useMultiFileAuthState("session")

    const sock = makeWASocket({
        auth: state,
        browser: ["ArmbianBot", "Chrome", "1.0"]
    })

    sock.ev.on("creds.update", saveCreds)

    let pairingDone = false

    sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {

        if (connection === "open") {
            console.log("🌐 Koneksi siap")

            // 🔑 REQUEST PAIRING DI SINI (BUKAN DI ATAS)
            if (!state.creds.registered && !pairingDone) {
                pairingDone = true
                try {
                    const code = await sock.requestPairingCode(nomor)
                    console.log("\n🔑 Pairing Code:", code)
                    console.log("📱 Cepat masukkan di HP!\n")
                } catch (err) {
                    console.log("❌ Gagal pairing:", err.message)
                }
            }

            console.log("✅ Login berhasil!")
        }

        if (connection === "close") {
            const statusCode = lastDisconnect?.error?.output?.statusCode

            if (statusCode === 428) {
                console.log("⏳ Menunggu pairing di HP...")
                return
            }

            console.log("❌ Koneksi putus, retry 5 detik...")
            setTimeout(() => startBot(), 5000)
        }
    })
}

startBot()
