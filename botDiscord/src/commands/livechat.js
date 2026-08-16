const { sendLivechat } = require("../services/livechatApi");
const { validateMediaMetadata } = require("../../../shared/mediaPolicy");
const { createUserCooldown } = require("../../../shared/livechatPolicy");

const livechatUserCooldown = createUserCooldown();

function createDeliveryReply(apiResult) {
    if (apiResult.recipientCount === 0) {
        return "Aucune application LiveChat n'est actuellement connectée.";
    }

    return "✅ LiveChat envoyé !";
}

module.exports = {
    // Envoie une image ou une vidéo vers les overlays connectés.
    name: "livechat",

    async execute(_bot, message, args) {
        const attachmentCount = message.attachments?.size || 0;
        const attachment = message.attachments?.first();

        if (!attachment) {
            return message.reply("❌ Tu dois envoyer une image ou une vidéo !");
        }

        if (attachmentCount !== 1) {
            return message.reply("❌ Envoie un seul média par commande LiveChat.");
        }

        const mediaValidation = validateMediaMetadata({
            fileName: attachment.name,
            contentType: attachment.contentType,
            size: attachment.size
        });

        if (!mediaValidation.valid) {
            return message.reply(`❌ ${mediaValidation.error}`);
        }

        const cooldownReservation = livechatUserCooldown.reserve(message.author.id);

        if (!cooldownReservation.accepted) {
            return message.reply(
                `⏳ Attends encore ${cooldownReservation.retryAfterSeconds} seconde(s) `
                + "avant d'envoyer un autre LiveChat."
            );
        }

        const livechat = {
            media: attachment.url,
            mediaType: mediaValidation.contentType,
            mediaSize: mediaValidation.size,
            texte: args.join(" ").trim(),
            user: {
                discordId: message.author.id,
                pseudo: message.author.username,
                avatar: message.author.displayAvatarURL()
            }
        };

        try {
            const apiResult = await sendLivechat(livechat);
            return message.reply(createDeliveryReply(apiResult));
        } catch (error) {
            cooldownReservation.release();
            throw error;
        }
    }
};
