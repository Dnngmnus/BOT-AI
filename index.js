async function startBot() {

    const nomor = await inputNomor() // ⬅️ ambil nomor dulu

    const { state, saveCreds } = await useMultiFileAuthState("session")

    const sock = makeWASocket({
        auth: state,
        browser: ["ArmbianBot", "Chrome", "1.0"]
    })

    sock.ev.on("creds.update", saveCreds)

    if (!state.creds.registered) {
        try {
            const code = await sock.requestPairingCode(nomor)
            console.log("\n🔑 Pairing Code:", code, "\n")
        } catch (err) {
            console.log("❌ Gagal pairing:", err.message)
        }
    }

    sock.ev.on("connection.update", ({ connection }) => {
        if (connection === "open") {
            console.log("✅ Login berhasil!")
        }

        if (connection === "close") {
            console.log("❌ Reconnecting...")
            startBot()
        }
    })
}

startBot()

    console.log("✅ Nomor:", nomor)
    return nomor
}

startBot()
