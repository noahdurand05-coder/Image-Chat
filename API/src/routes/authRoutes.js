const express = require("express");
const {
    createDiscordLoginSession,
    completeDiscordLogin,
    getDiscordLoginStatus,
    revokeDevice,
    completeUserTutorial,
    listUsers,
    updateUserStatus
} = require("../services/authService");
const {
    requireActiveUser,
    requireAdministrator
} = require("../middleware/authMiddleware");
const {
    getConnectedUserIds,
    disconnectUser
} = require("../services/realtimeService");

const router = express.Router();

function sendBrowserResult(res, successful) {
    const title = successful ? "Connexion terminée" : "Connexion impossible";
    const message = successful
        ? "Tu peux fermer cette page et revenir dans l'application LiveChat."
        : "La connexion n'a pas abouti. Retourne dans l'application et recommence.";

    res.status(successful ? 200 : 400).type("html").send(`
        <!doctype html>
        <html lang="fr">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>${title}</title>
            <style>
                body { margin: 0; background: #0d1017; color: #f7f8fb;
                    font-family: "Segoe UI", Arial, sans-serif; }
                main { display: grid; min-height: 100vh; place-content: center;
                    padding: 32px; text-align: center; }
                h1 { color: #a78bfa; }
                p { color: #aab2c2; line-height: 1.6; }
            </style>
        </head>
        <body><main><h1>${title}</h1><p>${message}</p></main></body>
        </html>
    `);
}

// ============================================================
// 1. Connexion avec Discord
// ============================================================

router.post("/auth/discord/start", async (req, res) => {
    try {
        const login = await createDiscordLoginSession(req.body?.deviceName);
        res.status(201).json(login);
    } catch (error) {
        console.error("Impossible de démarrer la connexion Discord.");
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

router.get("/auth/discord/callback", async (req, res) => {
    try {
        await completeDiscordLogin(req.query.code, req.query.state);
        sendBrowserResult(res, true);
    } catch (error) {
        console.error("La réponse OAuth de Discord a été refusée.");
        sendBrowserResult(res, false);
    }
});

router.get("/auth/discord/status/:sessionId", async (req, res) => {
    try {
        const status = await getDiscordLoginStatus(req.params.sessionId);
        res.json(status);
    } catch (error) {
        res.status(error.statusCode || 500).json({ error: error.message });
    }
});

// ============================================================
// 2. Session de l'application
// ============================================================

router.get("/auth/me", requireActiveUser, (req, res) => {
    const { deviceId, tokenHash, ...user } = req.auth;
    res.json({ user });
});

router.post("/auth/logout", requireActiveUser, async (req, res) => {
    try {
        await revokeDevice(req.auth.tokenHash, req.auth.deviceId);
        res.json({ message: "Déconnexion effectuée" });
    } catch {
        res.status(500).json({ error: "Impossible de fermer la session" });
    }
});

router.patch("/auth/tutorial", requireActiveUser, async (req, res) => {
    try {
        const result = await completeUserTutorial(req.auth.id);
        res.json(result);
    } catch {
        res.status(500).json({ error: "Impossible d'enregistrer le tutoriel" });
    }
});

// ============================================================
// 3. Administration des utilisateurs
// ============================================================

router.get(
    "/admin/users",
    requireActiveUser,
    requireAdministrator,
    async (_req, res) => {
        try {
            const connectedUserIds = new Set(getConnectedUserIds());
            const users = (await listUsers()).map((user) => ({
                ...user,
                online: connectedUserIds.has(user.id)
            }));

            res.json({ users });
        } catch {
            res.status(500).json({ error: "Impossible de charger les utilisateurs" });
        }
    }
);

router.patch(
    "/admin/users/:userId",
    requireActiveUser,
    requireAdministrator,
    async (req, res) => {
        const userId = Number.parseInt(req.params.userId, 10);

        try {
            const updated = await updateUserStatus(userId, req.body?.status);

            if (!updated) {
                return res.status(400).json({ error: "Utilisateur ou statut invalide" });
            }

            if (req.body?.status === "blocked" || req.body?.status === "rejected") {
                disconnectUser(userId);
            }

            res.json({ message: "Utilisateur mis à jour" });
        } catch {
            res.status(500).json({ error: "Impossible de modifier cet utilisateur" });
        }
    }
);

module.exports = router;
