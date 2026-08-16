const { clearLivechatQueue } = require("../services/livechatApi");

module.exports = {
    name: "clear",

    async execute(_bot, message) {
        const result = await clearLivechatQueue();
        const messageCount = result.clearedMessageCount;
        await message.reply(
            `File d'attente vidée : ${messageCount} message(s) retiré(s).`
        );
    }
};
