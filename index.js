const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys")
const readline = require("readline")

// ================= INPUT NOMOR =================
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

// ================= START BOT =================
async function startBot() {

    const nomor = await inputNomor()

    const { state, saveCreds } = await useMultiFileAuthState("session")

    const sock = makeWASocket({
        auth: state,
        browser: ["ArmbianBot", "Chrome", "1.0"]
    })

    sock.ev.on("creds.update", saveCreds)

    // 🔑 pairing
    if (!state.creds.registered) {
        try {
            const code = await sock.requestPairingCode(nomor)
            console.log("\n🔑 Pairing Code:", code, "\n")
        } catch (err) {
            console.log("❌ Gagal pairing:", err.message)
        }
    }

    sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {

        if (connection === "open") {
            console.log("✅ Login berhasil!")
        }

        if (connection === "close") {

            const statusCode = lastDisconnect?.error?.output?.statusCode

            if (statusCode === 428) {
            console.log("⏳ Tunggu... jangan matikan bot, segera input kode di HP!")
            return
        }

        console.log("❌ Koneksi putus, retry 5 detik...")
        setTimeout(() => startBot(), 5000)
        }
    })
}

// ================= RUN =================
startBot()
