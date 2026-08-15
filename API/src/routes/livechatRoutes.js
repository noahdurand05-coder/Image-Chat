
const express = require("express");
const router = express.Router();
const {
    insertDataBase,
    getUnconsumedMessages,
    consumeMessages
} = require("../message");

const MAX_TEXT_LENGTH = 2000;
const MAX_USERNAME_LENGTH = 50;
const MAX_URL_LENGTH = 4096;

// Ce nombre augmente chaque fois que Discord envoie la commande !stop.
// L'overlay compare cette valeur avec la précédente pour détecter un arrêt.
let stopRequestNumber = 0;

const ALLOWED_DISCORD_HOSTS = new Set([
    "cdn.discordapp.com",
    "media.discordapp.net"
]);

const ALLOWED_MEDIA_EXTENSIONS = new Set([
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".avif",
    ".mp4",
    ".webm",
    ".mov",
    ".m4v"
]);

// Vérifie qu'une URL appartient bien au service de fichiers de Discord.
function parseDiscordUrl(value) {
    if (typeof value !== "string" || value.length === 0 || value.length > MAX_URL_LENGTH) {
        return null;
    }

    try {
        const url = new URL(value);
        const isAllowed = url.protocol === "https:"
            && ALLOWED_DISCORD_HOSTS.has(url.hostname.toLowerCase());

        return isAllowed ? url : null;
    } catch {
        return null;
    }
}

function isAllowedMediaUrl(value) {
    const url = parseDiscordUrl(value);

    if (!url) {
        return false;
    }

    const pathname = url.pathname.toLowerCase();
    return [...ALLOWED_MEDIA_EXTENSIONS].some((extension) => pathname.endsWith(extension));
}

// Retourne un objet nettoyé, ou null lorsque les données sont incorrectes.
function validateLivechat(body) {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return null;
    }

    const { media, texte, user } = body;

    if (!isAllowedMediaUrl(media)) {
        return null;
    }

    if (typeof texte !== "string" || texte.length > MAX_TEXT_LENGTH) {
        return null;
    }

    if (!user || typeof user !== "object" || Array.isArray(user)) {
        return null;
    }

    const pseudo = typeof user.pseudo === "string" ? user.pseudo.trim() : "";

    if (!pseudo || pseudo.length > MAX_USERNAME_LENGTH || !parseDiscordUrl(user.avatar)) {
        return null;
    }

    return {
        media,
        texte: texte.trim(),
        user: {
            pseudo,
            avatar: user.avatar
        }
    };
}

// ============================================================
// Signal utilisé par la commande Discord !stop
// ============================================================

router.get("/stop", (req, res) => {
    res.json({ stopRequestNumber });
});

router.post("/stop", (req, res) => {
    stopRequestNumber += 1;
    res.json({ message: "Arrêt du LiveChat demandé", stopRequestNumber });
});

router.post("/", async (req, res) => {
    const livechat = validateLivechat(req.body);

    if (!livechat) {
        return res.status(400).json({ error: "Données du livechat invalides" });
    }

    try {
        await insertDataBase(livechat);
        res.json({ message: "Livechat reçu avec succès !" });
    } catch {
        console.error("Erreur lors de l'enregistrement d'un livechat.");
        res.status(500).json({ error: "Erreur lors de la réception du livechat" });
    }
});

router.get("/", async (req, res) => {
    try {
        const messages = await getUnconsumedMessages();
        res.json({ messages });
    } catch {
        console.error("Erreur lors de la récupération des livechats.");
        res.status(500).json({ error: "Erreur lors de la récupération du message" });
    }
});

router.patch("/", async (req, res) => {
    const id = req.body?.id;

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: "Identifiant de message invalide" });
    }

    try {
        const affectedRows = await consumeMessages(id);

        if (affectedRows === 0) {
            return res.status(404).json({ error: "Message introuvable ou déjà consommé" });
        }

        res.json({ message: "Message marqué comme consommé avec succès !" });
    } catch {
        console.error("Erreur lors de la consommation d'un livechat.");
        res.status(500).json({ error: "Erreur lors du marquage du message comme consommé" });
    }
});

module.exports = router;
