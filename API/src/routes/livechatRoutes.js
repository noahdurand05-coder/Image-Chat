
const express = require("express");
const router = express.Router();
const {
    createLivechatMessage,
    getUnconsumedMessages,
    consumeMessageForUser,
    countPendingMessages,
    clearPendingMessages
} = require("../services/messageService");
const {
    requireActiveUser,
    requireBotSecret
} = require("../middleware/authMiddleware");
const {
    getConnectedUserIds,
    sendEventToUsers,
    sendEventToAllConnectedUsers
} = require("../services/realtimeService");
const {
    reserveLivechatForUser
} = require("../services/livechatRateLimitService");
const { validateLivechat } = require("../validation/livechatValidation");
const { isActiveDiscordUser } = require("../services/authService");

const DISCORD_ID_PATTERN = /^\d{17,20}$/;

// Ce nombre augmente chaque fois que Discord envoie la commande !stop.
// L'overlay compare cette valeur avec la précédente pour détecter un arrêt.
let stopRequestNumber = 0;
let clearRequestNumber = 0;
let livechatPaused = false;

// ============================================================
// État et commandes de contrôle du LiveChat
// ============================================================

router.get("/stop", requireActiveUser, (req, res) => {
    res.json({
        stopRequestNumber,
        clearRequestNumber,
        paused: livechatPaused
    });
});

router.post("/stop", requireBotSecret, (req, res) => {
    stopRequestNumber += 1;
    sendEventToAllConnectedUsers({
        type: "livechat:stop",
        stopRequestNumber
    });
    res.json({ message: "Arrêt du LiveChat demandé", stopRequestNumber });
});

router.post("/next", requireBotSecret, (_req, res) => {
    stopRequestNumber += 1;
    sendEventToAllConnectedUsers({
        type: "livechat:next",
        stopRequestNumber
    });
    res.json({ message: "Passage au LiveChat suivant demandé" });
});

router.post("/pause", requireBotSecret, (_req, res) => {
    livechatPaused = true;
    sendEventToAllConnectedUsers({ type: "livechat:pause" });
    res.json({ message: "LiveChat mis en pause", paused: true });
});

router.post("/resume", requireBotSecret, (_req, res) => {
    livechatPaused = false;
    sendEventToAllConnectedUsers({ type: "livechat:resume" });
    res.json({ message: "LiveChat repris", paused: false });
});

router.post("/clear", requireBotSecret, async (_req, res) => {
    try {
        const clearedMessageCount = await clearPendingMessages();
        clearRequestNumber += 1;

        sendEventToAllConnectedUsers({
            type: "livechat:clear",
            clearRequestNumber
        });

        res.json({
            message: "File d'attente vidée",
            clearedMessageCount
        });
    } catch {
        console.error("Erreur pendant le vidage de la file LiveChat.");
        res.status(500).json({ error: "Impossible de vider la file d'attente" });
    }
});

router.get("/status", requireBotSecret, async (_req, res) => {
    try {
        res.json({
            paused: livechatPaused,
            connectedApplicationCount: getConnectedUserIds().length,
            pendingMessageCount: await countPendingMessages()
        });
    } catch {
        res.status(500).json({ error: "Impossible de récupérer l'état du LiveChat" });
    }
});

// Toutes les commandes Discord sont réservées aux comptes LiveChat actifs.
router.get("/access/:discordUserId", requireBotSecret, async (req, res) => {
    const { discordUserId } = req.params;

    if (!DISCORD_ID_PATTERN.test(discordUserId)) {
        return res.status(400).json({ error: "Identifiant Discord invalide" });
    }

    try {
        const authorized = await isActiveDiscordUser(discordUserId);
        res.json({ authorized });
    } catch {
        console.error("Erreur pendant la vérification d'un utilisateur LiveChat.");
        res.status(500).json({ error: "Impossible de vérifier cet utilisateur" });
    }
});

// ============================================================
// Réception et lecture des messages
// ============================================================

router.post("/", requireBotSecret, async (req, res) => {
    const validation = validateLivechat(req.body);

    if (!validation.livechat) {
        return res.status(400).json({ error: validation.error });
    }

    const cooldownReservation = reserveLivechatForUser(
        validation.livechat.user.discordId
    );

    if (!cooldownReservation.accepted) {
        res.set("Retry-After", String(cooldownReservation.retryAfterSeconds));
        return res.status(429).json({
            error: "Envoi trop rapide. "
                + `Réessaie dans ${cooldownReservation.retryAfterSeconds} seconde(s).`
        });
    }

    try {
        const delivery = await createLivechatMessage(
            validation.livechat,
            getConnectedUserIds()
        );

        sendEventToUsers(delivery.recipientUserIds, {
            type: "livechat:new",
            messageId: delivery.messageId
        });

        res.json({
            message: "Livechat reçu avec succès !",
            recipientCount: delivery.recipientUserIds.length
        });
    } catch {
        cooldownReservation.release();
        console.error("Erreur lors de l'enregistrement d'un livechat.");
        res.status(500).json({ error: "Erreur lors de la réception du livechat" });
    }
});

router.get("/", requireActiveUser, async (req, res) => {
    try {
        const messages = await getUnconsumedMessages(req.auth.id);
        res.json({ messages });
    } catch {
        console.error("Erreur lors de la récupération des livechats.");
        res.status(500).json({ error: "Erreur lors de la récupération du message" });
    }
});

router.patch("/", requireActiveUser, async (req, res) => {
    const id = req.body?.id;

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: "Identifiant de message invalide" });
    }

    try {
        const affectedRows = await consumeMessageForUser(id, req.auth.id);

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
