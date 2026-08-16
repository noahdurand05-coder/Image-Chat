const { pauseLivechat } = require("../services/livechatApi");

module.exports = {
    name: "pause",

    async execute(_bot, message) {
        await pauseLivechat();
        await message.reply("LiveChat mis en pause.");
    }
};
