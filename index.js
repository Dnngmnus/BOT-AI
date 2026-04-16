const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys")

const qrcode = require("qrcode-terminal")

async function startBot() {

    const { state, saveCreds } = await useMultiFileAuthState("session")
    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        version,
        auth: state,
        browser: ["Windows", "Chrome", "120.0.0"]
    })

    sock.ev.on("creds.update", saveCreds)

    sock.ev.on("connection.update", (update) => {
        const { connection, qr } = update

        if (qr) {
            console.log("📱 Scan QR ini:")
            qrcode.generate(qr, { small: true })
        }

        if (connection === "open") {
            console.log("✅ Login berhasil!")
        }

        if (connection === "close") {
            console.log("❌ Koneksi putus, reconnect...")
            startBot()
        }
    })
}

startBot()
