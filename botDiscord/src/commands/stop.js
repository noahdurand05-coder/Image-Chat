const { stopLivechat } = require("../services/livechatApi");

module.exports = {
    // Arrête le média actuellement affiché sur les overlays connectés.
    name: "stop",

    async execute(_bot, message) {
        await stopLivechat();
        await message.reply("LiveChat Stoppé");
    }
};
