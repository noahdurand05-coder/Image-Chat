const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const http = require("node:http");
const express = require("express");
const cors = require("cors");
const { connectDB, pool } = require("./config/db");
const livechatRoutes = require("./routes/livechatRoutes");
const authRoutes = require("./routes/authRoutes");
const { initializeAuthentication } = require("./services/authService");
const { initializeRealtimeServer } = require("./services/realtimeService");
const {
    initializeMessageCleanup,
    initializeMessageDeliveries,
    deleteExpiredConsumedMessages
} = require("./services/messageService");

// Création de l'application HTTP.
const app = express();
const httpServer = http.createServer(app);
const PORT = Number.parseInt(process.env.PORT, 10) || 3000;
const HOST = process.env.HOST || "127.0.0.1";
const CLEANUP_CHECK_INTERVAL_MINUTES = 1;
const MILLISECONDS_PER_MINUTE = 60 * 1000;

// Le bot Node.js n'envoie pas d'origine. L'overlay Electron, chargé depuis
// un fichier local, utilise l'origine "null". Toute page web est refusée.
const corsOptions = {
    origin(origin, callback) {
        const isLocalProgram = !origin || origin === "null" || origin.startsWith("file://");
        callback(null, isLocalProgram);
    },
    methods: ["GET", "POST", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Bot-Api-Key"]
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "20kb", strict: true }));
app.use("/api", authRoutes);
app.use("/api/livechat", livechatRoutes);

function startMessageCleanup() {
    setInterval(async () => {
        try {
            await deleteExpiredConsumedMessages();
        } catch {
            console.error("Erreur pendant le nettoyage des anciens messages.");
        }
    }, CLEANUP_CHECK_INTERVAL_MINUTES * MILLISECONDS_PER_MINUTE);
}

function listenHttpServer() {
    return new Promise((resolve, reject) => {
        httpServer.once("error", reject);
        httpServer.listen(PORT, HOST, () => {
            httpServer.removeListener("error", reject);
            resolve();
        });
    });
}

// Le serveur démarre seulement lorsque la base et ses tables sont prêtes.
async function startServer() {
    try {
        await connectDB();
        await initializeAuthentication();
        await initializeMessageCleanup();
        await initializeMessageDeliveries();
        await deleteExpiredConsumedMessages();

        // Le port est réservé avant de brancher le serveur WebSocket.
        // Cela évite une erreur WebSocket illisible si le port est déjà pris.
        await listenHttpServer();
        initializeRealtimeServer(httpServer);
        startMessageCleanup();

        console.log(`Serveur démarré sur http://${HOST}:${PORT}`);
    } catch (error) {
        if (error.code === "EADDRINUSE") {
            console.error(
                `Impossible de démarrer : le port ${PORT} est déjà utilisé. `
                + "Une autre API LiveChat est probablement ouverte."
            );
        } else {
            console.error("Erreur au démarrage du serveur :", error.message);
        }

        await pool.end();
        process.exitCode = 1;
    }
}

startServer();
