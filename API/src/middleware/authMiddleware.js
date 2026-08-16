const crypto = require("node:crypto");
const { findAuthenticatedUser } = require("../services/authService");

// ============================================================
// 1. Authentification des applications Electron
// ============================================================

async function requireActiveUser(req, res, next) {
    const authorization = req.get("Authorization") || "";
    const [scheme, accessToken] = authorization.split(" ");

    if (scheme !== "Bearer" || !accessToken) {
        return res.status(401).json({ error: "Authentification requise" });
    }

    try {
        const user = await findAuthenticatedUser(accessToken);

        if (!user) {
            return res.status(401).json({ error: "Session invalide ou compte bloqué" });
        }

        req.auth = user;
        next();
    } catch {
        console.error("Erreur pendant la vérification d'une session utilisateur.");
        res.status(500).json({ error: "Impossible de vérifier la session" });
    }
}

function requireAdministrator(req, res, next) {
    if (req.auth?.role !== "admin") {
        return res.status(403).json({ error: "Accès administrateur requis" });
    }

    next();
}

// ============================================================
// 2. Authentification séparée du bot Discord
// ============================================================

function safeSecretComparison(receivedSecret, expectedSecret) {
    if (!receivedSecret || !expectedSecret) {
        return false;
    }

    const receivedBuffer = Buffer.from(receivedSecret);
    const expectedBuffer = Buffer.from(expectedSecret);

    return receivedBuffer.length === expectedBuffer.length
        && crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
}

function requireBotSecret(req, res, next) {
    const configuredSecret = process.env.BOT_API_SECRET;

    if (!configuredSecret || configuredSecret.length < 32) {
        return res.status(503).json({ error: "Clé du bot non configurée sur l'API" });
    }

    if (!safeSecretComparison(req.get("X-Bot-Api-Key"), configuredSecret)) {
        return res.status(401).json({ error: "Bot non autorisé" });
    }

    next();
}

module.exports = {
    requireActiveUser,
    requireAdministrator,
    requireBotSecret
};
