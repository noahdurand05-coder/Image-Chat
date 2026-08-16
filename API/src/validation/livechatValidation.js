const { validateMediaMetadata } = require("../../../shared/mediaPolicy");

// Limites appliquées aux données reçues depuis le bot Discord.
const MAX_TEXT_LENGTH = 2000;
const MAX_USERNAME_LENGTH = 50;
const MAX_URL_LENGTH = 4096;
const DISCORD_ID_PATTERN = /^\d{17,20}$/;

const ALLOWED_DISCORD_HOSTS = new Set([
    "cdn.discordapp.com",
    "media.discordapp.net"
]);

// Accepte uniquement une URL HTTPS provenant du CDN officiel de Discord.
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

function parseDiscordMediaUrl(value) {
    const url = parseDiscordUrl(value);

    if (!url || !url.pathname.toLowerCase().startsWith("/attachments/")) {
        return null;
    }

    return url;
}

function invalid(error) {
    return { livechat: null, error };
}

// Retourne soit des données nettoyées, soit une explication du refus.
function validateLivechat(body) {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return invalid("Le contenu du LiveChat est invalide.");
    }

    const { media, mediaType, mediaSize, texte, user } = body;
    const mediaUrl = parseDiscordMediaUrl(media);

    if (!mediaUrl) {
        return invalid("Le média doit être une pièce jointe provenant de Discord.");
    }

    const mediaValidation = validateMediaMetadata({
        fileName: mediaUrl.pathname,
        contentType: mediaType,
        size: mediaSize
    });

    if (!mediaValidation.valid) {
        return invalid(mediaValidation.error);
    }

    if (typeof texte !== "string" || texte.length > MAX_TEXT_LENGTH) {
        return invalid(`Le texte ne doit pas dépasser ${MAX_TEXT_LENGTH} caractères.`);
    }

    if (!user || typeof user !== "object" || Array.isArray(user)) {
        return invalid("Les informations de l'utilisateur Discord sont invalides.");
    }

    const discordId = typeof user.discordId === "string"
        ? user.discordId.trim()
        : "";
    const pseudo = typeof user.pseudo === "string" ? user.pseudo.trim() : "";

    if (
        !DISCORD_ID_PATTERN.test(discordId)
        || !pseudo
        || pseudo.length > MAX_USERNAME_LENGTH
        || !parseDiscordUrl(user.avatar)
    ) {
        return invalid("Le profil de l'utilisateur Discord est invalide.");
    }

    return {
        livechat: {
            media,
            texte: texte.trim(),
            user: {
                discordId,
                pseudo,
                avatar: user.avatar
            }
        },
        error: null
    };
}

module.exports = { validateLivechat };
