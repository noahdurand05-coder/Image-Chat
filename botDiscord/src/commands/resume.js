const { resumeLivechat } = require("../services/livechatApi");

module.exports = {
    name: "resume",

    async execute(_bot, message) {
        await resumeLivechat();
        await message.reply("LiveChat repris.");
    }
};
