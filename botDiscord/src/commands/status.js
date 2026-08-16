const { getLivechatStatus } = require("../services/livechatApi");

module.exports = {
    name: "status",

    async execute(_bot, message) {
        const status = await getLivechatStatus();
        const activity = status.paused ? "En pause" : "Actif";

        await message.reply([
            `État du LiveChat : ${activity}`,
            `Applications actives : ${status.connectedApplicationCount}`,
            `Messages en attente : ${status.pendingMessageCount}`
        ].join("\n"));
    }
};
