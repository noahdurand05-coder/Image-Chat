const express = require("express");
const cors = require("cors");
const { connectDB } = require("./db");
require("dotenv").config();
const livechatRoutes = require("./routes/livechatRoutes");
const {
    initializeMessageCleanup,
    deleteExpiredConsumedMessages
} = require("./message");
// Création d'une application Express pour gérer les requêtes HTTP et démarrer le serveur.

const app = express();
const PORT = Number.parseInt(process.env.PORT, 10) || 3000;
const LOCAL_HOST = "127.0.0.1";
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
    allowedHeaders: ["Content-Type"]
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "20kb", strict: true }));
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


//Démarrage du serveur après avoir vérifié la connexion à la base de données. Si la connexion échoue, le serveur ne démarre pas et une erreur est affichée dans la console.

async function startServer() {
try {
    await connectDB();
    await initializeMessageCleanup();
    await deleteExpiredConsumedMessages();
    startMessageCleanup();

    app.listen(PORT, LOCAL_HOST, () => {
        console.log(`Serveur local démarré sur http://${LOCAL_HOST}:${PORT}`);
    });
} catch {
    console.error("Erreur au démarrage du serveur.");
}
}


startServer();
